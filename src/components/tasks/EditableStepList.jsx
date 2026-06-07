import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, X, Plus, Clock, Check } from "lucide-react";

const DURATION_OPTIONS = [2, 5, 10, 15];

function StepRow({ step, index, onUpdate, onDelete, isFirst }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(step.title);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitEdit = () => {
    if (draft.trim()) onUpdate({ ...step, title: draft.trim() });
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") { setDraft(step.title); setEditing(false); }
  };

  // Long press to reveal delete on mobile
  const handlePointerDown = () => {
    const t = setTimeout(() => setShowDelete(true), 500);
    setLongPressTimer(t);
  };
  const handlePointerUp = () => {
    clearTimeout(longPressTimer);
  };

  const changeDuration = (mins) => {
    onUpdate({ ...step, duration_minutes: mins, estimated_minutes: mins });
  };

  const currentDuration = step.duration_minutes || step.estimated_minutes || 5;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.18 }}
      className={`relative group flex items-start gap-3 p-3.5 rounded-2xl border-2 transition-colors ${
        isFirst
          ? "border-green-200 bg-green-50"
          : "border-gray-200 bg-white hover:border-purple-200"
      }`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
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
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="w-full text-sm font-semibold text-gray-800 bg-purple-50 border border-purple-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        ) : (
          <p
            className="text-sm font-semibold text-gray-800 cursor-text leading-snug"
            onClick={() => { setDraft(step.title); setEditing(true); }}
          >
            {step.title}
          </p>
        )}

        {/* Duration pill row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Clock className="w-3 h-3 text-gray-400" />
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => changeDuration(d)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
                currentDuration === d
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-500 border-gray-200 hover:border-purple-300"
              }`}
            >
              {d}m
            </button>
          ))}
          {!DURATION_OPTIONS.includes(currentDuration) && (
            <span className="text-xs text-gray-400">{currentDuration}m</span>
          )}
        </div>

        {step.tip && !editing && (
          <p className="text-xs text-gray-400 leading-tight">{step.tip}</p>
        )}
      </div>

      {/* Action buttons — always visible on desktop, shown on long press on mobile */}
      <div className={`flex-shrink-0 flex items-center gap-1 transition-opacity ${
        showDelete ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      }`}>
        <button
          onClick={() => { setDraft(step.title); setEditing(true); setShowDelete(false); }}
          className="p-1.5 rounded-lg hover:bg-purple-100 text-gray-400 hover:text-purple-600 transition-colors"
          title="Edit step"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => { onDelete(); setShowDelete(false); }}
          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
          title="Delete step"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mobile long-press dismiss overlay */}
      {showDelete && (
        <button
          className="absolute inset-0 rounded-2xl"
          onClick={() => setShowDelete(false)}
          style={{ zIndex: -1 }}
        />
      )}
    </motion.div>
  );
}

function AddStepRow({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(5);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), duration_minutes: duration, estimated_minutes: duration });
    setTitle("");
    setDuration(5);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") { setOpen(false); setTitle(""); }
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
            className="flex flex-col gap-2 p-3.5 rounded-2xl border-2 border-purple-300 bg-purple-50"
          >
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe this step..."
              className="w-full text-sm bg-white border border-purple-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-gray-400"
            />
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <div className="flex gap-1.5">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      duration === d
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-gray-500 border-gray-200 hover:border-purple-300"
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
              <div className="ml-auto flex gap-1.5">
                <button
                  onClick={() => { setOpen(false); setTitle(""); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!title.trim()}
                  className="p-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="add-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-purple-300 hover:text-purple-600 text-sm font-medium transition-all hover:bg-purple-50"
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
 *   steps: array of { title, duration_minutes | estimated_minutes, tip? }
 *   onChange: (updatedSteps) => void
 */
export default function EditableStepList({ steps, onChange }) {
  const updateStep = (index, updated) => {
    const next = [...steps];
    next[index] = updated;
    onChange(next);
  };

  const deleteStep = (index) => {
    onChange(steps.filter((_, i) => i !== index));
  };

  const addStep = (newStep) => {
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
      <AddStepRow onAdd={addStep} />
    </div>
  );
}