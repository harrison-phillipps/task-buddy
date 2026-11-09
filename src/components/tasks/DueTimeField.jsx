import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";

/**
 * Optional "Add a time" control for a task's due date.
 *
 * Renders nothing while the task has no due date, and never prefills a time —
 * the field starts empty and stays empty unless the person picks one.
 */
export default function DueTimeField({ dueDate, value, onChange, id = "due_time" }) {
  if (!dueDate) return null;

  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
        <Clock className="w-3.5 h-3.5" />
        Add a time
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="time"
          value={value || ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-32"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Reminders at this time respect your quiet hours.
      </p>
    </div>
  );
}