import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Check, X, Clock, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function OverwhelmedBreakdown({ task, onApply, onClose }) {
  const [isLoading, setIsLoading] = useState(false);
  const [subtasks, setSubtasks] = useState(null);
  const [encouragement, setEncouragement] = useState("");

  const generate = async () => {
    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an ADHD coach helping someone who feels overwhelmed by a task.
Break this task into small, concrete, actionable steps they can do one at a time.
Make each step feel manageable (max 20 minutes each). Be warm and specific.

Task: "${task.title}"
${task.description ? `Description: ${task.description}` : ""}
${task.category ? `Category: ${task.category}` : ""}
${task.difficulty ? `Difficulty: ${task.difficulty}` : ""}

Output 4–7 subtasks. Also give a short 1-sentence encouragement message.`,
        response_json_schema: {
          type: "object",
          properties: {
            subtasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  estimated_minutes: { type: "number" },
                  order: { type: "number" }
                }
              }
            },
            encouragement: { type: "string" }
          }
        }
      });

      setSubtasks(result.subtasks.map(s => ({ ...s, completed: false })));
      setEncouragement(result.encouragement);
    } catch (e) {
      console.error("Breakdown error:", e);
      toast.error("Couldn't generate breakdown. Please try again.");
    }
    setIsLoading(false);
  };

  const handleApply = () => {
    if (subtasks) onApply(subtasks);
  };

  // Auto-generate on mount
  React.useEffect(() => { generate(); }, []);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-teal-50 dark:from-purple-900/30 dark:to-teal-900/30 overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-semibold text-purple-900 dark:text-purple-200">
              Let's break this down 💜
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 py-4 justify-center text-purple-600 dark:text-purple-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Breaking it down for you…</span>
          </div>
        )}

        <AnimatePresence>
          {subtasks && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              {encouragement && (
                <p className="text-xs text-purple-700 dark:text-purple-300 italic mb-3">
                  ✨ {encouragement}
                </p>
              )}

              {subtasks.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-purple-100 dark:border-purple-800 text-sm"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-800 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-300 flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-gray-800 dark:text-gray-200 truncate">{s.title}</span>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1 ml-2 flex-shrink-0 dark:bg-gray-700 dark:text-gray-300">
                    <Clock className="w-3 h-3" />
                    {s.estimated_minutes}m
                  </Badge>
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
                  onClick={handleApply}
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Apply to Task
                </Button>
                <Button size="sm" variant="outline" onClick={generate} className="dark:text-gray-300">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}