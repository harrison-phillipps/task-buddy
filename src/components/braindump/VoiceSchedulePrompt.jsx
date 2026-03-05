import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, X, Sparkles } from "lucide-react";

export default function VoiceSchedulePrompt({ tasks = [], onSchedule, onDismiss, visible }) {
  if (!visible || tasks.length === 0) return null;

  const mustDoTasks = tasks.filter(t => t.task_priority === "must_do");
  const highlightTasks = mustDoTasks.length > 0 ? mustDoTasks : tasks.slice(0, 2);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-teal-50 shadow-lg">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Ready to focus?</p>
                  <p className="text-xs text-gray-500">
                    {tasks.length} task{tasks.length !== 1 ? "s" : ""} extracted — schedule one into a Focus Session now?
                  </p>
                </div>
              </div>
              <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 mt-0.5">
                <X className="w-4 h-4" />
              </button>
            </div>

            {highlightTasks.length > 0 && (
              <div className="mb-4 space-y-1.5">
                {highlightTasks.map((task, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-purple-100 text-sm cursor-pointer hover:border-purple-300 transition-colors"
                    onClick={() => onSchedule(task)}
                  >
                    <span className="text-gray-800 font-medium truncate flex-1 mr-2">{task.title}</span>
                    <span className="text-xs text-purple-600 whitespace-nowrap flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      Focus now
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
                onClick={() => onSchedule(highlightTasks[0])}
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Start Focus Session
              </Button>
              <Button size="sm" variant="outline" onClick={onDismiss} className="flex-1">
                Save & Come Back Later
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}