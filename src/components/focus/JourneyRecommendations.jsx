import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, TrendingUp, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function JourneyRecommendations({ 
  currentMood, 
  currentEnergy, 
  taskDifficulty,
  journeyData,
  onApplyRecommendation 
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

  const generateRecommendations = async () => {
    if (!journeyData || journeyData.length < 3) {
      toast.error("Need at least 3 sessions to generate personalized recommendations");
      return;
    }

    setIsGenerating(true);
    try {
      const currentTime = new Date().getHours();
      const timeOfDay = currentTime < 12 ? "morning" : currentTime < 17 ? "afternoon" : "evening";

      // Prepare historical data summary
      const historyData = journeyData.slice(0, 20).map(s => ({
        technique: s.focus_technique,
        sound: s.ambient_sound,
        mood_before: s.mood_before,
        mood_after: s.mood_after,
        effectiveness: s.effectiveness_score,
        mindfulness: s.mindfulness_used,
        time_of_day: s.time_of_day,
        difficulty: s.task_difficulty
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI focus coach analyzing a user's historical session data to provide HIGHLY PERSONALIZED recommendations.

CURRENT STATE:
- Mood: ${currentMood || "neutral"}
- Energy: ${currentEnergy || "medium"}
- Task Difficulty: ${taskDifficulty || "medium"}
- Time of Day: ${timeOfDay}

HISTORICAL SESSION DATA (last ${historyData.length} sessions):
${JSON.stringify(historyData, null, 2)}

ANALYZE THE PATTERNS:
1. Which techniques worked best for this user historically?
2. What sounds correlate with higher effectiveness?
3. How does mood/energy affect their performance?
4. When do they perform best (time of day)?
5. Does mindfulness help this specific user?
6. Which settings work for similar mood/energy/difficulty combinations?

PROVIDE PERSONALIZED RECOMMENDATIONS:

1. RECOMMENDED TECHNIQUE (standard/pomodoro)
   - Based on their historical success

2. WORK INTERVAL & BREAK INTERVAL (in minutes)
   - Optimized for their patterns

3. RECOMMENDED SOUND
   - What has worked best for them in similar states

4. MINDFULNESS RECOMMENDATION (true/false + type)
   - Should they use mindfulness breaks?
   - If yes: breathing, meditation, or body_scan

5. SESSION LENGTH SUGGESTION (in minutes)
   - Based on similar past sessions

6. PERSONALIZED STRATEGY TIPS
   - 2-3 specific tips based on their data

7. CONFIDENCE SCORE (0-100)
   - How confident are you in these recommendations?

8. REASONING
   - Explain WHY these specific recommendations based on THEIR data

Be data-driven and specific to THIS user's patterns!`,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_technique: { type: "string" },
            work_interval: { type: "number" },
            break_interval: { type: "number" },
            recommended_sound: { type: "string" },
            use_mindfulness: { type: "boolean" },
            mindfulness_type: { type: "string" },
            session_length: { type: "number" },
            strategy_tips: {
              type: "array",
              items: { type: "string" }
            },
            confidence_score: { type: "number" },
            reasoning: { type: "string" }
          }
        }
      });

      setRecommendations(result);
      toast.success("Generated personalized recommendations!");
    } catch (error) {
      console.error("Error generating recommendations:", error);
      toast.error("Failed to generate recommendations");
    }
    setIsGenerating(false);
  };

  const applyRecommendations = () => {
    if (recommendations) {
      onApplyRecommendation({
        focusTechnique: recommendations.recommended_technique,
        workInterval: recommendations.work_interval,
        breakInterval: recommendations.break_interval,
        ambientSound: recommendations.recommended_sound,
        includeMindfulness: recommendations.use_mindfulness,
        mindfulnessType: recommendations.mindfulness_type
      });
      toast.success("Applied your personalized settings!");
    }
  };

  const needsMoreData = !journeyData || journeyData.length < 3;

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-indigo-900">
          <Sparkles className="w-5 h-5" />
          Personalized Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {needsMoreData ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 mb-2">
              Complete {3 - (journeyData?.length || 0)} more session{3 - (journeyData?.length || 0) !== 1 ? 's' : ''} to unlock personalized AI recommendations based on your unique focus patterns!
            </p>
            <Badge variant="outline" className="bg-indigo-100 text-indigo-700">
              {journeyData?.length || 0} / 3 sessions
            </Badge>
          </div>
        ) : !recommendations ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 mb-4">
              Get AI recommendations tailored to YOUR historical performance patterns
            </p>
            <Button
              onClick={generateRecommendations}
              disabled={isGenerating}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Your Journey...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get My Personalized Plan
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
            <div className="p-3 bg-white rounded-lg border border-indigo-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-indigo-900">Based on Your Data:</p>
                <Badge className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
                  {recommendations.confidence_score}% Confidence
                </Badge>
              </div>
              <p className="text-sm text-gray-700">{recommendations.reasoning}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Your Best Technique</p>
                <Badge className="capitalize">{recommendations.recommended_technique}</Badge>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Optimal Sound</p>
                <Badge className="capitalize">{recommendations.recommended_sound?.replace('_', ' ')}</Badge>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs font-semibold text-gray-900 mb-2">Timing</p>
              <div className="flex gap-2 text-sm text-gray-700">
                <span>Work: <strong>{recommendations.work_interval}min</strong></span>
                <span>•</span>
                <span>Break: <strong>{recommendations.break_interval}min</strong></span>
                <span>•</span>
                <span>Session: <strong>{recommendations.session_length}min</strong></span>
              </div>
            </div>

            {recommendations.use_mindfulness && (
              <div className="p-3 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg border border-teal-200">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-teal-600" />
                  <p className="text-xs font-semibold text-teal-900">Mindfulness Recommended</p>
                </div>
                <p className="text-sm text-teal-700">
                  {recommendations.mindfulness_type} exercises - proven to boost YOUR effectiveness
                </p>
              </div>
            )}

            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Your Personalized Strategy:
              </p>
              <ul className="space-y-1">
                {recommendations.strategy_tips?.map((tip, idx) => (
                  <li key={idx} className="text-sm text-gray-700">• {tip}</li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setRecommendations(null)}
                variant="outline"
                className="flex-1"
              >
                Regenerate
              </Button>
              <Button
                onClick={applyRecommendations}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
              >
                Apply My Plan
              </Button>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}