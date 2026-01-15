import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Lightbulb, TrendingUp, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TaskBreakdownBot({ taskTitle, taskDescription, onSuggestion }) {
  const [isThinking, setIsThinking] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  const getBreakdownSuggestion = async () => {
    setIsThinking(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You're a Task Breakdown Bot - an expert at helping people break down overwhelming tasks into manageable steps.

Task: "${taskTitle}"
${taskDescription ? `Description: ${taskDescription}` : ''}

Provide:
1. A brief motivational message about this task (1 sentence, encouraging)
2. 3 helpful tips for breaking down this specific type of task
3. Suggested number of subtasks (3-8 is ideal)
4. Recommended difficulty level (easy/medium/hard)
5. Estimated time per subtask

Be encouraging, specific, and practical. Help the user feel capable!`,
        response_json_schema: {
          type: "object",
          properties: {
            motivation: { type: "string" },
            tips: { type: "array", items: { type: "string" } },
            suggested_subtask_count: { type: "number" },
            recommended_difficulty: { type: "string" },
            time_estimate_per_subtask: { type: "number" },
            energy_tip: { type: "string" }
          }
        }
      });

      setSuggestion(result);
      if (onSuggestion) onSuggestion(result);
    } catch (error) {
      console.error("Breakdown bot error:", error);
    }
    setIsThinking(false);
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-indigo-900">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          Task Breakdown Coach
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!suggestion && !isThinking && (
          <div className="text-center py-4">
            <p className="text-sm text-indigo-700 mb-4">
              Get AI-powered insights to break down this task effectively
            </p>
            <Button
              onClick={getBreakdownSuggestion}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Get Breakdown Tips
            </Button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {isThinking && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3" />
              <p className="text-sm text-indigo-600">Analyzing your task...</p>
            </motion.div>
          )}

          {suggestion && (
            <motion.div
              key="suggestion"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="p-3 bg-white rounded-lg border border-indigo-200">
                <p className="text-sm text-indigo-900 italic">💡 {suggestion.motivation}</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Breakdown Tips:
                </h4>
                {suggestion.tips?.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-indigo-700">
                    <Badge className="bg-indigo-500 text-white mt-0.5">{idx + 1}</Badge>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-lg border border-indigo-200">
                  <p className="text-xs text-indigo-600 mb-1">Recommended Steps</p>
                  <p className="text-lg font-bold text-indigo-900">
                    {suggestion.suggested_subtask_count}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-indigo-200">
                  <p className="text-xs text-indigo-600 mb-1">Difficulty</p>
                  <p className="text-lg font-bold text-indigo-900 capitalize">
                    {suggestion.recommended_difficulty}
                  </p>
                </div>
              </div>

              {suggestion.energy_tip && (
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <p className="text-xs font-semibold text-indigo-900 mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Energy Tip:
                  </p>
                  <p className="text-sm text-indigo-800">{suggestion.energy_tip}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}