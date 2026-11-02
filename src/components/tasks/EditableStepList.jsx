import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, X, Plus, Clock, Check } from "lucide-react";

// Step timing rules. 2 minutes is the floor for a CHOSEN duration: anything
// shorter isn't a step. A step with no estimate at all is "unknown" — a
// different thing, which is neither rounded up to 2 nor added to a total.
export const STEP_DURATION_OPTIONS = [2, 5, 10, 15, 20, 30];
export const MIN_STEP_MINUTES = 2;
export const STEP_TITLE_MIN = 2;
export const STEP_TITLE_MAX = 120;
export const MAX_STEPS = 20;

export const clampStepMinutes = (minutes) =>
  Math.max(MIN_STEP_MINUTES, Math.round(Number(minutes) || 0));

// A step carries its time in estimated_minutes only. duration_minutes is read
// here purely for steps produced before that change (guest flow fallbacks).
// null means the step has no usable estimate.
export const stepMinutesOrNull = (step) => {
  const raw = step?.estimated_minutes ?? step?.duration_minutes;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

// Total time for a set of steps. Unknown steps contribute nothing rather than
// inventing the 2-minute floor.
export const sumStepMinutes = (steps = []) =>
  steps.reduce((total, step) => total + (stepMinutesOrNull(step) ?? 0), 0);

export const countUnknownSteps = (steps = []) =>
  steps.filter((step) => stepMinutesOrNull(step) === null).length;

const cleanTitle = (title) => (title || "").trim();

const titleError = (title) => {
  const cleaned = cleanTitle(title);
  if (cleaned.length === STEP_TITLE_MIN - 1) {
    return `Steps need at least ${STEP_TITLE_MIN} characters.`;
  }
  return `Steps can be at most ${STEP_TITLE_MAX} characters.`;
};

const isValidTitle = (title) => {
  const cleaned = cleanTitle(title);
  return cleaned.length >= STEP_TITLE_MIN && cleaned.length <= STEP_TITLE_MAX;
};

function StepRow({ step, index, onUpdate, onDelete, isFirst }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(step.title);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  // Keep the draft tied to the step it belongs to. If this row is handed a
  // different step (a sibling was deleted), we must never show or save the
  // neighbour's title.
  useEffect(() => {
    setDraft(step.title);
    setError("");
  }, [step.title]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitEdit = () => {
    if (!isValidTitle(draft)) {
      setError(titleError(draft));
      return;
    }
    onUpdate({ ...step, title: cleanTitle(draft) });
    setError("");
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") { setDraft(step.title); setError(""); setEditing(false); }
  };

  const changeDuration = (mins) => {
    onUpdate({ ...step, estimated_minutes: clampStepMinutes(mins) });
  };

  const currentDuration = stepMinutesOrNull(step);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.18 }}
      className={`group flex items-start gap-3 p-3.5 rounded-2xl border-2 transition-colors ${
        isFirst
          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
          : "border-gray-200 bg-white hover:border-purple-200 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-purple-700"
      }`}
    >
      {/* Step number */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5 ${
        isFirst ? "bg-gradient-to-br from-green-400 to-teal-500" : "bg-gradient-to-br from-purple-500 to-teal-500"
      }`}>
        {isFirst ? "🚀" : index + 1}
      </div>

      {/* Title + duration */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(""); }}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            maxLength={STEP_TITLE_MAX}
            className="w-full text-sm font-semibold text-gray-800 bg-purple-50 border border-purple-300 rounded-lg px-2 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-purple-400 dark:bg-gray-800 dark:text-gray-100 dark:border-purple-700"
          />
        ) : (
          <p
            className="text-sm font-semibold text-gray-800 dark:text-gray-100 cursor-text leading-snug py-2"
            onClick={() => { setDraft(step.title); setEditing(true); }}
          >
            {step.title}
          </p>
        )}

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

        {/* Duration pill row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500" />
          {STEP_DURATION_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => changeDuration(d)}
              className={`text-xs px-3 min-h-[44px] min-w-[44px] rounded-full border transition-all ${
                currentDuration === d
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-500 border-gray-200 hover:border-purple-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:border-purple-500"
              }`}
            >
              {d}m
            </button>
          ))}
          {currentDuration === null ? (
            <span className="text-xs italic text-gray-400 dark:text-gray-500">Time unknown</span>
          ) : (
            !STEP_DURATION_OPTIONS.includes(currentDuration) && (
              <span className="text-xs text-gray-400 dark:text-gray-500">{currentDuration}m</span>
            )
          )}
        </div>

        {step.tip && !editing && (
          <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">{step.tip}</p>
        )}
      </div>

      {/* Actions — delete stays visible on touch screens, reveals on hover on desktop */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => { setDraft(step.title); setEditing(true); }}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-purple-100 text-gray-400 hover:text-purple-600 transition-colors dark:hover:bg-purple-950/50 dark:hover:text-purple-300"
          title="Edit step"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors dark:text-gray-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          title="Delete step"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

function AddStepRow({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(5);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const handleAdd = () => {
    if (!isValidTitle(title)) {
      setError(titleError(title));
      return;
    }
    onAdd({ title: cleanTitle(title), estimated_minutes: clampStepMinutes(duration) });
    setTitle("");
    setDuration(5);
    setError("");
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") { setOpen(false); setTitle(""); setError(""); }
  };

  return (
    <div className="mt-1">
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div
            key="add-form"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex flex-col gap-2 p-3.5 rounded-2xl border-2 border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-950/30"
          >
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              maxLength={STEP_TITLE_MAX}
              placeholder="Describe this step..."
              className="w-full text-sm min-h-[44px] bg-white border border-purple-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-gray-400 dark:bg-gray-900 dark:text-gray-100 dark:border-purple-700"
            />
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex items-center gap-2 flex-wrap">
              <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <div className="flex gap-1.5 flex-wrap">
                {STEP_DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`text-xs px-3 min-h-[44px] min-w-[44px] rounded-full border transition-all ${
                      duration === d
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-gray-500 border-gray-200 hover:border-purple-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:border-purple-500"
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
              <div className="ml-auto flex gap-1.5">
                <button
                  type="button"
                  onClick={() => { setOpen(false); setTitle(""); setError(""); }}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors dark:hover:bg-gray-800"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!isValidTitle(title)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="add-btn"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setOpen(true)}
            className="w-full flex items-center justify-center gap-2 min-h-[44px] py-2.5 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-purple-300 hover:text-purple-600 text-sm font-medium transition-all hover:bg-purple-50 dark:border-gray-600 dark:text-gray-400 dark:hover:border-purple-600 dark:hover:text-purple-300 dark:hover:bg-purple-950/30"
          >
            <Plus className="w-4 h-4" />
            Add step
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * EditableStepList
 * Props:
 *   steps: array of { title, estimated_minutes, tip? }
 *   onChange: (updatedSteps) => void
 *   maxSteps: optional cap (default 20)
 *
 * Everything here is local state — editing a step never calls the AI or the API.
 */
export default function EditableStepList({ steps = [], onChange, maxSteps = MAX_STEPS }) {
  const atLimit = steps.length >= maxSteps;

  const updateStep = (index, updated) => {
    const next = [...steps];
    next[index] = updated;
    onChange(next);
  };

  const deleteStep = (index) => {
    onChange(steps.filter((_, i) => i !== index));
  };

  const addStep = (newStep) => {
    if (atLimit) return;
    onChange([...steps, newStep]);
  };

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {steps.map((step, i) => (
          <StepRow
            key={i}
            step={step}
            index={i}
            isFirst={i === 0}
            onUpdate={(updated) => updateStep(i, updated)}
            onDelete={() => deleteStep(i)}
          />
        ))}
      </AnimatePresence>
      {atLimit ? (
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 py-2">
          Maximum of {maxSteps} steps reached.
        </p>
      ) : (
        <AddStepRow onAdd={addStep} />
      )}
    </div>
  );
}