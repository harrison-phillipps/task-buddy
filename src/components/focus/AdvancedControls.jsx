import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Brain, Zap, Activity, Clock, Coffee, Loader2, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function AdvancedControls({ 
  task,
  currentMood,
  currentEnergy,
  sessionDuration,
  onApplySettings,
  onTaskAdjustment
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

  const analyzeOptimalSettings = async () => {
    setIsAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI productivity coach analyzing optimal focus session parameters.

CURRENT STATE:
- Task: ${task?.title || "Not specified"}
- Task Difficulty: ${task?.difficulty || "medium"}
- Task Category: ${task?.category || "general"}
- Subtasks Count: ${task?.subtasks?.length || 0}
- User Mood: ${currentMood || "neutral"}
- Energy Level: ${currentEnergy || "medium"}
- Session Duration So Far: ${sessionDuration || 0} minutes

ANALYZE AND RECOMMEND:

1. OPTIMAL SESSION LENGTH (in minutes) - Range: 15-90 minutes
2. OPTIMAL BREAK DURATION (in minutes) - Range: 3-15 minutes
3. PREDICTED FOCUS DROP POINT (in minutes)
4. TASK ADJUSTMENT NEEDED? (true/false + suggestion)
5. MINDFULNESS INTEGRATION - Should include mindfulness breaks? type: breathing/meditation/body_scan
6. REASONING

Be precise and evidence-based!`,
        response_json_schema: {
          type: "object",
          properties: {
            optimal_session_length: { type: "number" },
            optimal_break_duration: { type: "number" },
            predicted_focus_drop_minutes: { type: "number" },
            task_adjustment_needed: { type: "boolean" },
            adjustment_suggestion: { type: "string" },
            include_mindfulness: { type: "boolean" },
            mindfulness_type: { type: "string" },
            reasoning: { type: "string" }
          }
        }
      });

      setRecommendations(result);
      toast.success("Analysis complete!");
    } catch (error) {
      console.error("Error analyzing settings:", error);
      toast.error("Analysis failed");
    }
    setIsAnalyzing(false);
  };

  const applyRecommendations = () => {
    if (recommendations) {
      onApplySettings({
        sessionLength: recommendations.optimal_session_length,
        breakDuration: recommendations.optimal_break_duration,
        includeMindfulness: recommendations.include_mindfulness,
        mindfulnessType: recommendations.mindfulness_type
      });
      toast.success("Applied AI recommendations!");
    }
  };

  const handleTaskAdjustment = () => {
    if (recommendations?.adjustment_suggestion) {
      onTaskAdjustment(recommendations.adjustment_suggestion);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Brain className="w-5 h-5" />
          Advanced AI Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!recommendations ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 mb-4">
              Get AI-powered recommendations for optimal session parameters
            </p>
            <Button
              onClick={analyzeOptimalSettings}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Analyze Optimal Settings
                </>
              )}
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="p-3 bg-white rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 mb-1">AI Analysis:</p>
              <p className="text-sm text-gray-700">{recommendations.reasoning}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-lg text-center">
                <Clock className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                <p className="text-xs text-gray-600 mb-1">Session Length</p>
                <p className="text-lg font-bold text-blue-900">{recommendations.optimal_session_length} min</p>
              </div>
              <div className="p-3 bg-white rounded-lg text-center">
                <Coffee className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                <p className="text-xs text-gray-600 mb-1">Break Duration</p>
                <p className="text-lg font-bold text-purple-900">{recommendations.optimal_break_duration} min</p>
              </div>
            </div>

            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-orange-600" />
                <p className="text-xs font-semibold text-orange-900">Focus Drop Prediction</p>
              </div>
              <p className="text-sm text-orange-700">
                Focus likely to decline after ~{recommendations.predicted_focus_drop_minutes} minutes
              </p>
            </div>

            {recommendations.task_adjustment_needed && (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-600" />
                    <p className="text-xs font-semibold text-yellow-900">Task Adjustment Suggested</p>
                  </div>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    Action Needed
                  </Badge>
                </div>
                <p className="text-sm text-yellow-700 mb-2">{recommendations.adjustment_suggestion}</p>
                <Button
                  onClick={handleTaskAdjustment}
                  size="sm"
                  variant="outline"
                  className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                >
                  Apply Task Adjustment
                </Button>
              </div>
            )}

            {recommendations.include_mindfulness && (
              <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-teal-600" />
                  <p className="text-xs font-semibold text-teal-900">Mindfulness Recommended</p>
                </div>
                <p className="text-sm text-teal-700">
                  {recommendations.mindfulness_type === "breathing" && "Deep breathing exercises during breaks"}
                  {recommendations.mindfulness_type === "meditation" && "Short guided meditation during breaks"}
                  {recommendations.mindfulness_type === "body_scan" && "Progressive body scan relaxation"}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => setRecommendations(null)} variant="outline" className="flex-1">
                Re-analyze
              </Button>
              <Button
                onClick={applyRecommendations}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
              >
                Apply Settings
              </Button>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}