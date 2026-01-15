import { Badge } from "@/components/ui/badge";
import { RefreshCw, Calendar } from "lucide-react";
import { motion } from "framer-motion";

const patternLabels = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 Weeks",
  monthly: "Monthly",
  custom: "Custom"
};

export default function RecurringTaskBadge({ task, showDetails = false }) {
  if (!task.is_recurring) return null;

  const isTemplate = !task.parent_recurring_task_id;
  const pattern = patternLabels[task.recurrence_pattern] || task.recurrence_pattern;

  if (showDetails) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200"
      >
        <RefreshCw className="w-4 h-4 text-purple-600" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-purple-700">
            {isTemplate ? "Recurring Template" : "From Recurring Task"}
          </p>
          {isTemplate && (
            <p className="text-xs text-purple-600">
              Repeats: {pattern}
              {task.next_occurrence_date && (
                <> • Next: {new Date(task.next_occurrence_date).toLocaleDateString()}</>
              )}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
      <RefreshCw className="w-3 h-3" />
      {isTemplate ? pattern : "Recurring"}
    </Badge>
  );
}