import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Clock, Zap, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SmartTimerRecommendations({
  currentMood,
  energyLevel,
  taskDifficulty,
  journeyData = [],
  onApplyRecommendation
}) {
  const [recommendation, setRecommendation] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeOptimalTiming = async () => {
    setIsAnalyzing(true);
    
    try {
      // Analyze historical data patterns
      const recentSessions = journeyData.slice(0, 15);
      const avgEffectiveness = recentSessions.length > 0
        ? recentSessions.reduce((sum, s) => sum + (s.effectiveness_score || 50), 0) / recentSessions.length
        : 50;

      const prompt = `You are an expert productivity coach analyzing someone's focus patterns.

CURRENT STATE:
- Mood: ${currentMood || 'neutral'}
- Energy Level: ${energyLevel || 'medium'}
- Task Difficulty: ${taskDifficulty || 'medium'}

HISTORICAL DATA (last ${recentSessions.length} sessions):
- Average Effectiveness: ${avgEffectiveness.toFixed(0)}%
- Most Successful Sessions: ${recentSessions
  .filter(s => s.effectiveness_score > 70)
  .map(s => `${s.focus_technique} (${s.work_interval}/${s.break_interval}min, ${s.ambient_sound} sound)`)
  .slice(0, 3)
  .join(', ') || 'No data yet'}

PATTERNS OBSERVED:
${recentSessions.length > 5 ? `
- Morning sessions: ${recentSessions.filter(s => s.time_of_day === 'morning').length}
- Afternoon sessions: ${recentSessions.filter(s => s.time_of_day === 'afternoon').length}
- Evening sessions: ${recentSessions.filter(s => s.time_of_day === 'evening').length}
- Pomodoro technique used: ${recentSessions.filter(s => s.focus_technique === 'pomodoro').length} times
- Standard technique used: ${recentSessions.filter(s => s.focus_technique === 'standard').length} times
` : 'Not enough data for pattern analysis'}

Based on current state and historical patterns, recommend:
1. Optimal work interval duration (10-60 minutes)
2. Optimal break interval duration (3-15 minutes)
3. Best focus technique (pomodoro or standard)
4. Recommended ambient sound
5. Specific tips for this session

Consider:
- Low energy/tired mood = shorter intervals with more breaks
- High energy/focused mood = longer intervals
- Hard tasks = break them into smaller pomodoro sessions
- Current effectiveness patterns from their history
- Time of day and energy curves`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            work_interval: {
              type: "number",
              description: "Recommended work interval in minutes (10-60)"
            },
            break_interval: {
              type: "number",
              description: "Recommended break interval in minutes (3-15)"
            },
            focus_technique: {
              type: "string",
              enum: ["standard", "pomodoro"],
              description: "Recommended technique"
            },
            ambient_sound: {
              type: "string",
              enum: ["none", "rain", "cafe", "forest", "ocean", "white_noise", "brown_noise"],
              description: "Recommended ambient sound"
            },
            reasoning: {
              type: "string",
              description: "Brief explanation of why these settings work for current state"
            },
            tips: {
              type: "array",
              items: { type: "string" },
              description: "2-3 specific tips for this session"
            },
            confidence: {
              type: "number",
              description: "Confidence score 1-100"
            }
          }
        }
      });

      setRecommendation(result);
      toast.success("Smart recommendations generated! ✨");
    } catch (error) {
      console.error("Error generating recommendations:", error);
      toast.error("Failed to generate recommendations");
    }
    
    setIsAnalyzing(false);
  };

  const getEnergyIcon = () => {
    if (energyLevel === 'high') return <Zap className="w-4 h-4 text-yellow-500" />;
    if (energyLevel === 'low') return <Zap className="w-4 h-4 text-gray-400" />;
    return <Zap className="w-4 h-4 text-orange-500" />;
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Smart Timer Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!recommendation ? (
          <>
            <div className="space-y-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Get AI-powered work/break intervals optimized for your current state and past performance.
              </p>
              
              <div className="flex items-center gap-2 flex-wrap">
                {currentMood && (
                  <Badge variant="outline" className="text-xs">
                    😊 {currentMood}
                  </Badge>
                )}
                {energyLevel && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    {getEnergyIcon()}
                    {energyLevel} energy
                  </Badge>
                )}
                {taskDifficulty && (
                  <Badge variant="outline" className="text-xs">
                    📊 {taskDifficulty} task
                  </Badge>
                )}
              </div>
            </div>

            <Button
              onClick={analyzeOptimalTiming}
              disabled={isAnalyzing}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get Smart Recommendations
                </>
              )}
            </Button>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Recommendation Summary */}
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Optimal Settings</h4>
                <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                  {recommendation.confidence}% confident
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Work Interval</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                    <Clock className="w-5 h-5" />
                    {recommendation.work_interval}m
                  </p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Break Interval</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Clock className="w-5 h-5" />
                    {recommendation.break_interval}m
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Technique:</span>
                  <Badge variant="outline" className="capitalize">
                    {recommendation.focus_technique}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Sound:</span>
                  <Badge variant="outline" className="capitalize">
                    {recommendation.ambient_sound.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div className="pt-3 border-t border-purple-100 dark:border-purple-800">
                <p className="text-xs text-gray-700 dark:text-gray-300 italic">
                  💡 {recommendation.reasoning}
                </p>
              </div>
            </div>

            {/* Tips */}
            {recommendation.tips && recommendation.tips.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tips for this session:</h5>
                {recommendation.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  onApplyRecommendation({
                    workInterval: recommendation.work_interval,
                    breakInterval: recommendation.break_interval,
                    focusTechnique: recommendation.focus_technique,
                    ambientSound: recommendation.ambient_sound
                  });
                  toast.success("Settings applied!");
                }}
                className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                Apply These Settings
              </Button>
              <Button
                onClick={() => setRecommendation(null)}
                variant="outline"
                size="icon"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}