import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Check, X, Clock, Zap, BarChart2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function AITaskBreakdownSuggestion({ 
  taskTitle, 
  taskDescription, 
  taskDifficulty,
  taskCategory,
  onApplySuggestions,
  autoAnalyze = true,
  compact = false 
}) {
  const [suggestions, setSuggestions] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
  const [autoTriggered, setAutoTriggered] = useState(false);
  const debounceRef = useRef(null);
  const lastAnalyzedTitle = useRef("");

  // No auto-trigger — user must click "Get AI suggestion"

  const analyzeTask = async (silent = false) => {
    if (!taskTitle || taskTitle.trim().length < 3) {
      if (!silent) toast.error("Please enter a task title first");
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a productivity expert. Analyze this task and break it down into clear, actionable subtasks with accurate time estimates.

TASK TO ANALYZE:
Title: ${taskTitle}
Description: ${taskDescription || 'No description provided'}
Difficulty: ${taskDifficulty || 'medium'}
Category: ${taskCategory || 'general'}

Create 3-7 specific, actionable subtasks that:
1. Start with action verbs (Research, Write, Review, Set up, etc.)
2. Are ordered logically (prerequisites first)
3. Each take 5-60 minutes
4. Cover everything needed to complete the main task

For each subtask provide a realistic time estimate in minutes based on the difficulty and category.
Also provide an overall time estimate, a complexity score (1-10), and one practical tip.`,
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
            complexity_score: { type: "number" },
            difficulty_assessment: {
              type: "string",
              enum: ["easy", "medium", "hard"]
            },
            tips: { type: "string" }
          }
        }
      });

      setSuggestions(result);
      setSelectedSuggestions(new Set(result.subtasks.map((_, i) => i)));
      if (!silent) toast.success("AI breakdown complete! ✨");
    } catch (error) {
      console.error("Error analyzing task:", error);
      if (!silent) toast.error("Failed to analyze task");
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

  const totalSelectedTime = suggestions
    ? suggestions.subtasks
        .filter((_, i) => selectedSuggestions.has(i))
        .reduce((sum, st) => sum + (st.estimated_minutes || 0), 0)
    : 0;

  const complexityColor = suggestions?.complexity_score >= 7 
    ? "text-red-600" 
    : suggestions?.complexity_score >= 4 
    ? "text-yellow-600" 
    : "text-green-600";

  if (compact && !suggestions) {
    return (
      <Button
        onClick={() => analyzeTask(false)}
        disabled={isAnalyzing || !taskTitle}
        variant="outline"
        size="sm"
        className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
      >
        {isAnalyzing ? (
          <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Analyzing...</>
        ) : (
          <><Sparkles className="w-3 h-3 mr-2" />Get AI suggestion</>
        )}
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {isAnalyzing && !suggestions && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700"
          >
            <Loader2 className="w-5 h-5 text-purple-600 animate-spin flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                {autoTriggered ? "✨ Analyzing your task automatically..." : "Analyzing task..."}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">Breaking it down into actionable steps</p>
            </div>
          </motion.div>
        )}

        {!suggestions && !isAnalyzing && (
          <motion.div key="trigger" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Button
              onClick={() => analyzeTask(false)}
              disabled={!taskTitle || taskTitle.trim().length < 3}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Get AI suggestion
            </Button>
          </motion.div>
        )}

        {suggestions && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="pt-4 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    AI Breakdown
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
                      <Clock className="w-3 h-3" />
                      {totalSelectedTime}m selected
                    </Badge>
                    {suggestions.complexity_score && (
                      <Badge variant="outline" className={`text-xs ${complexityColor}`}>
                        <BarChart2 className="w-3 h-3 mr-1" />
                        {suggestions.complexity_score}/10
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Tips */}
                {suggestions.tips && (
                  <div className="flex items-start gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg border border-purple-100 dark:border-purple-800">
                    <Zap className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">{suggestions.tips}</p>
                  </div>
                )}

                {/* Subtasks */}
                <div className="space-y-2">
                  {suggestions.subtasks.map((subtask, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        selectedSuggestions.has(index)
                          ? 'bg-white dark:bg-gray-800 border-purple-300 dark:border-purple-600 shadow-sm'
                          : 'bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50'
                      }`}
                      onClick={() => toggleSuggestion(index)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
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
                            <p className="font-medium text-sm text-gray-900 dark:text-gray-100 leading-snug">
                              {subtask.title}
                            </p>
                            <Badge variant="outline" className="flex-shrink-0 text-xs whitespace-nowrap">
                              <Clock className="w-2.5 h-2.5 mr-1" />
                              {subtask.estimated_minutes}m
                            </Badge>
                          </div>
                          {subtask.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                              {subtask.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={applySelected}
                    disabled={selectedSuggestions.size === 0}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    Apply {selectedSuggestions.size > 0 ? `${selectedSuggestions.size} steps` : ""}
                    {totalSelectedTime > 0 && ` · ${totalSelectedTime}m`}
                  </Button>
                  <Button
                    onClick={() => {
                      setSuggestions(null);
                      setSelectedSuggestions(new Set());
                      setAutoTriggered(false);
                      lastAnalyzedTitle.current = "";
                    }}
                    variant="outline"
                    size="icon"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}