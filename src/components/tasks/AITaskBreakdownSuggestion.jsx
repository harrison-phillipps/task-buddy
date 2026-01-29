import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Check, X, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function AITaskBreakdownSuggestion({ 
  taskTitle, 
  taskDescription, 
  taskDifficulty,
  onApplySuggestions,
  compact = false 
}) {
  const [suggestions, setSuggestions] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());

  const analyzeTask = async () => {
    if (!taskTitle || taskTitle.trim().length < 3) {
      toast.error("Please enter a task title first");
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const prompt = `You are a productivity expert helping someone break down a task into actionable subtasks.

TASK TO ANALYZE:
Title: ${taskTitle}
Description: ${taskDescription || 'No description provided'}
Difficulty: ${taskDifficulty || 'medium'}

Break this task down into 3-8 clear, actionable subtasks that:
1. Are specific and measurable
2. Can be completed in order (logical sequence)
3. Each take a reasonable amount of time (5-60 minutes)
4. Cover all aspects needed to complete the main task
5. Are written as action items (start with verbs)

Also estimate:
- Time needed for each subtask (in minutes)
- Overall difficulty assessment
- Any dependencies between subtasks

Return a structured breakdown.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
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
                  order: { type: "number" },
                  description: { type: "string" }
                }
              }
            },
            total_estimated_time: { type: "number" },
            difficulty_assessment: {
              type: "string",
              enum: ["easy", "medium", "hard"]
            },
            tips: { type: "string" }
          }
        }
      });

      setSuggestions(result);
      // Select all by default
      setSelectedSuggestions(new Set(result.subtasks.map((_, i) => i)));
      toast.success("AI breakdown complete! ✨");
    } catch (error) {
      console.error("Error analyzing task:", error);
      toast.error("Failed to analyze task");
    }
    
    setIsAnalyzing(false);
  };

  const toggleSuggestion = (index) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSuggestions(newSelected);
  };

  const applySelected = () => {
    const selected = suggestions.subtasks
      .filter((_, i) => selectedSuggestions.has(i))
      .map((st, i) => ({
        title: st.title,
        estimated_minutes: st.estimated_minutes,
        order: i,
        completed: false
      }));
    
    onApplySuggestions(selected);
    toast.success(`Applied ${selected.length} subtasks!`);
  };

  if (compact && !suggestions) {
    return (
      <Button
        onClick={analyzeTask}
        disabled={isAnalyzing || !taskTitle}
        variant="outline"
        size="sm"
        className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3 mr-2" />
            AI Auto-Breakdown
          </>
        )}
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      {!suggestions ? (
        <Button
          onClick={analyzeTask}
          disabled={isAnalyzing || !taskTitle}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing task...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              AI Auto-Breakdown Subtasks
            </>
          )}
        </Button>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    AI Suggestions
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      {suggestions.subtasks.length} steps
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ~{suggestions.total_estimated_time}m
                    </Badge>
                  </div>
                </div>

                {suggestions.tips && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 italic bg-white dark:bg-gray-800 p-2 rounded">
                    💡 {suggestions.tips}
                  </p>
                )}

                <div className="space-y-2">
                  {suggestions.subtasks.map((subtask, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        selectedSuggestions.has(index)
                          ? 'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
                      }`}
                      onClick={() => toggleSuggestion(index)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          selectedSuggestions.has(index)
                            ? 'bg-purple-500 border-purple-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectedSuggestions.has(index) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                              {subtask.title}
                            </p>
                            <Badge variant="outline" className="flex-shrink-0 text-xs">
                              {subtask.estimated_minutes}m
                            </Badge>
                          </div>
                          {subtask.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {subtask.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={applySelected}
                    disabled={selectedSuggestions.size === 0}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    Apply Selected ({selectedSuggestions.size})
                  </Button>
                  <Button
                    onClick={() => {
                      setSuggestions(null);
                      setSelectedSuggestions(new Set());
                    }}
                    variant="outline"
                    size="icon"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}