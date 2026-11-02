import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Repeat, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EditableStepList, { clampStepMinutes } from "@/components/tasks/EditableStepList";

// A task's time is always the sum of its steps — there is no independent number
// to edit, so the two can never drift apart.
export const sumStepMinutes = (steps = []) =>
  steps.reduce(
    (total, step) => total + clampStepMinutes(step?.estimated_minutes ?? step?.duration_minutes),
    0
  );

export default function BrainDumpTaskCard({ task, index, groupBy, onChange, onRemove }) {
  const [showSteps, setShowSteps] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);

  // The draft follows the task it belongs to. Cards are keyed by a stable client
  // id, so removing one card can never leave another showing or saving its title.
  useEffect(() => {
    setTitleDraft(task.title);
    setEditingTitle(false);
  }, [task.clientId, task.title]);

  const steps = task.subtasks || [];
  const totalMinutes = sumStepMinutes(steps);

  const commitTitle = () => {
    const title = (titleDraft || "").trim().slice(0, 120);
    if (!title) {
      setTitleDraft(task.title);
      setEditingTitle(false);
      return;
    }
    if (title !== task.title) onChange({ title });
    setEditingTitle(false);
  };

  const handleStepsChange = (nextSteps) => {
    onChange({ subtasks: nextSteps, estimated_minutes: sumStepMinutes(nextSteps) });
  };

  const priorityChip = (priority) => {
    if (priority === "must_do") return { label: "🔴 Must Do", cls: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300" };
    if (priority === "should_do") return { label: "🟡 Should Do", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300" };
    return { label: "🟢 Could Do", cls: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300" };
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-950/30 dark:to-teal-950/30 rounded-xl border border-purple-100 dark:border-purple-900/60"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <Input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); }
              }}
              maxLength={120}
              autoFocus
              className="text-lg font-bold mb-2 min-h-[44px] dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="group/title flex items-start gap-2 text-left mb-2 min-h-[44px] w-full"
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{task.title}</h3>
              <Pencil className="w-3.5 h-3.5 mt-1.5 flex-shrink-0 text-gray-400 opacity-100 md:opacity-0 md:group-hover/title:opacity-100 transition-opacity dark:text-gray-500" />
            </button>
          )}

          <div className="flex flex-wrap gap-2 mb-2">
            {groupBy !== "category" && (
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                {task.category}
              </Badge>
            )}
            {groupBy !== "difficulty" && (
              <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">{task.difficulty}</Badge>
            )}
            {groupBy !== "energy" && (
              <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">
                {task.energy_level_needed} energy
              </Badge>
            )}
            {groupBy !== "priority" && task.task_priority && (
              <Badge className={priorityChip(task.task_priority).cls}>
                {priorityChip(task.task_priority).label}
              </Badge>
            )}
            {task.is_recurring && (
              <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 flex items-center gap-1">
                <Repeat className="w-3 h-3" />
                {task.recurrence_pattern}
              </Badge>
            )}
          </div>

          {task.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{task.description}</p>
          )}
          {task.is_recurring && task.recurrence_reason && (
            <p className="text-xs text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/30 p-2 rounded mb-3 italic">
              🔄 {task.recurrence_reason}
            </p>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={`Remove ${task.title}`}
          className="min-w-[44px] min-h-[44px] flex-shrink-0 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
            Steps ({steps.length}) · {totalMinutes}m
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSteps((v) => !v)}
            className="min-h-[44px] px-3 bg-white/80 hover:bg-purple-50 border-purple-200 text-purple-700 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            {showSteps ? "Done editing" : "Edit steps"}
          </Button>
        </div>

        {showSteps ? (
          <EditableStepList steps={steps} onChange={handleStepsChange} />
        ) : (
          <div className="space-y-2">
            {steps.map((subtask, subIndex) => (
              <div key={subIndex} className="flex items-center gap-3 text-sm min-h-[44px]">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-300">
                  {subIndex + 1}
                </span>
                <span className="flex-1 text-gray-700 dark:text-gray-300">{subtask.title}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {clampStepMinutes(subtask.estimated_minutes ?? subtask.duration_minutes)}m
                </span>
              </div>
            ))}
            {steps.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No steps yet — tap Edit steps to add some.
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}