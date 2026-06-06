import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Volume2, Coffee, Lightbulb, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function RealTimeAICoach({ 
  sessionState,
  onSuggestion
}) {
  const [suggestion, setSuggestion] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState(null);

  // Auto-interval removed — user taps "Get AI Insight" button to trigger analysis

  const analyzeFocusState = async () => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      const sessionDuration = sessionState.sessionStartTime 
        ? Math.round((Date.now() - sessionState.sessionStartTime) / 60000)
        : 0;

      const pauseCount = sessionState.pauseCount || 0;
      const completedSubtasks = sessionState.completedSubtasks?.size || 0;
      const totalSubtasks = sessionState.totalSubtasks || 0;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a real-time AI focus coach monitoring an active work session. Analyze the current state and provide ONE specific, actionable suggestion.

SESSION STATE:
- Duration so far: ${sessionDuration} minutes
- Pauses taken: ${pauseCount}
- Progress: ${completedSubtasks}/${totalSubtasks} subtasks done
- Current mood before session: ${sessionState.moodBefore}
- Current sound: ${sessionState.ambientSound}
- Technique: ${sessionState.focusTechnique}
- Time remaining: ${Math.floor(sessionState.timeLeft / 60)} minutes

ANALYSIS GUIDELINES:
1. If many pauses (>3) → suggest break or sound change
2. If long duration (>40min) without break → strongly suggest break
3. If slow progress → suggest task adjustment or motivation boost
4. If good progress → encouragement
5. If wrong sound for state → suggest better ambient sound
6. If nearing completion → final push motivation

Provide ONE specific suggestion with a type:
- "sound_change": suggest better ambient sound
- "take_break": recommend a break activity
- "adjust_task": suggest task modification
- "motivation": encouragement
- "keep_going": affirm current approach

Be specific, supportive, and actionable!`,
        response_json_schema: {
          type: "object",
          properties: {
            type: { type: "string" },
            suggestion: { type: "string" },
            reason: { type: "string" },
            suggested_sound: { type: "string" },
            suggested_break_activity: { type: "string" }
          }
        }
      });

      setSuggestion(result);
      setLastAnalysis(Date.now());
    } catch (error) {
      console.error("Error analyzing focus state:", error);
    }
    setIsAnalyzing(false);
  };

  const applySuggestion = () => {
    if (!suggestion) return;

    if (suggestion.type === "sound_change" && suggestion.suggested_sound) {
      onSuggestion({
        type: "sound",
        value: suggestion.suggested_sound
      });
      toast.success("Changed ambient sound!");
    } else if (suggestion.type === "take_break") {
      onSuggestion({
        type: "break",
        value: suggestion.suggested_break_activity
      });
      toast.success("Taking a smart break!");
    }

    setSuggestion(null);
  };

  const getSuggestionIcon = () => {
    switch (suggestion?.type) {
      case "sound_change": return Volume2;
      case "take_break": return Coffee;
      case "adjust_task": return Lightbulb;
      default: return Brain;
    }
  };

  const getSuggestionColor = () => {
    switch (suggestion?.type) {
      case "sound_change": return "from-blue-500 to-purple-500";
      case "take_break": return "from-orange-500 to-red-500";
      case "adjust_task": return "from-yellow-500 to-orange-500";
      default: return "from-purple-500 to-teal-500";
    }
  };

  return (
    <AnimatePresence>
      {suggestion && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-50 max-w-md"
        >
          <Card className={`bg-gradient-to-br ${getSuggestionColor()} border-2 border-white shadow-2xl`}>
            <CardContent className="p-4 text-white">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  {React.createElement(getSuggestionIcon(), { className: "w-5 h-5" })}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-white/30 text-white text-xs">
                      AI Insight
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-auto hover:bg-white/20"
                      onClick={() => setSuggestion(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="font-semibold text-sm mb-1">{suggestion.suggestion}</p>
                  <p className="text-xs text-white/80 mb-3">{suggestion.reason}</p>
                  
                  {(suggestion.type === "sound_change" || suggestion.type === "take_break") && (
                    <Button
                      onClick={applySuggestion}
                      size="sm"
                      className="bg-white text-gray-900 hover:bg-white/90 w-full"
                    >
                      Apply Suggestion
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!suggestion && sessionState.isActive && !sessionState.isBreakTime && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed bottom-6 right-6 z-40"
        >
          <Button
            onClick={analyzeFocusState}
            disabled={isAnalyzing || (lastAnalysis && Date.now() - lastAnalysis < 60000)}
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white shadow-lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Get AI Insight
              </>
            )}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}