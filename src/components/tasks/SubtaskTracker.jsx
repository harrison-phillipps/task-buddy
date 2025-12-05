import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle2, Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function SubtaskTracker({ subtasks = [], onToggle, compact = false }) {
  const completedCount = subtasks.filter(st => st.completed).length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>{completedCount}/{totalCount} completed</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-purple-600" />
          <span className="font-medium text-sm text-gray-700">
            Progress: {completedCount}/{totalCount}
          </span>
        </div>
        <Badge variant="outline" className="text-xs">
          {Math.round(progress)}%
        </Badge>
      </div>
      
      <Progress value={progress} className="h-2" />
      
      <div className="space-y-2">
        <AnimatePresence>
          {subtasks.map((subtask, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                subtask.completed ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <Checkbox
                checked={subtask.completed}
                onCheckedChange={() => onToggle(index)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                  {subtask.title}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {subtask.estimated_minutes && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {subtask.estimated_minutes}m
                    </Badge>
                  )}
                  {subtask.completed && subtask.completed_date && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      ✓ {format(new Date(subtask.completed_date), 'MMM d')}
                    </Badge>
                  )}
                  {subtask.scheduled_date && !subtask.completed && (
                    <Badge variant="outline" className="text-xs">
                      📅 {format(new Date(subtask.scheduled_date), 'MMM d')}
                    </Badge>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}