import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, TrendingUp, Sparkles, Loader2, Lightbulb, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function MoodCoach({ currentMood, journeyData, onSuggestRitual }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [moodInsights, setMoodInsights] = useState(null);

  const analyzeMoodPatterns = async () => {
    if (!journeyData || journeyData.length < 3) {
      toast.error("Need at least 3 sessions for mood insights");
      return;
    }

    setIsAnalyzing(true);
    try {
      // Filter for mood data
      const moodSessions = journeyData.filter(s => s.mood_before && s.mood_after);
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI Mood Coach analyzing a user's emotional patterns during focus sessions.

CURRENT MOOD: ${currentMood || "not specified"}

HISTORICAL MOOD DATA (${moodSessions.length} sessions):
${JSON.stringify(moodSessions.map(s => ({
  mood_before: s.mood_before,
  mood_after: s.mood_after,
  effectiveness: s.effectiveness_score,
  technique: s.focus_technique,
  mindfulness: s.mindfulness_used,
  time_of_day: s.time_of_day
})), null, 2)}

ANALYZE AND PROVIDE:

1. MOOD SHIFT PATTERNS
   - Which moods typically improve during sessions?
   - Which moods tend to worsen?
   - What percentage of sessions improve mood?

2. CURRENT MOOD ANALYSIS (if specified)
   - How does this mood typically perform in sessions?
   - What usually happens to this mood by session end?
   - Success rate when starting with this mood

3. PRE-SESSION RITUAL FOR CURRENT MOOD
   - A specific 3-5 minute ritual to optimize their session
   - Tailored to transform their current mood into peak focus state
   - Should be actionable and evidence-based

4. MOOD-FOCUS CORRELATION
   - Which starting moods lead to best effectiveness?
   - Which mood transitions indicate successful sessions?

5. PERSONALIZED ADVICE
   - 3 specific strategies to manage mood for better focus
   - Based on THEIR patterns, not generic advice

6. MOOD MANAGEMENT SCORE (0-100)
   - How well are they managing mood-focus relationship?

Be specific, supportive, and data-driven!`,
        response_json_schema: {
          type: "object",
          properties: {
            mood_improvement_rate: { type: "number" },
            current_mood_success_rate: { type: "number" },
            current_mood_typical_outcome: { type: "string" },
            pre_session_ritual: { type: "string" },
            best_starting_moods: {
              type: "array",
              items: { type: "string" }
            },
            successful_transitions: {
              type: "array",
              items: { type: "string" }
            },
            personalized_strategies: {
              type: "array",
              items: { type: "string" }
            },
            mood_management_score: { type: "number" },
            insights_summary: { type: "string" }
          }
        }
      });

      setMoodInsights(result);
      
      if (result.pre_session_ritual && onSuggestRitual) {
        onSuggestRitual(result.pre_session_ritual);
      }
      
      toast.success("Mood insights ready!");
    } catch (error) {
      console.error("Error analyzing mood:", error);
      toast.error("Analysis failed");
    }
    setIsAnalyzing(false);
  };

  const getMoodEmoji = (mood) => {
    const emojis = {
      energized: "⚡",
      focused: "🎯",
      tired: "😴",
      anxious: "😰",
      neutral: "😐",
      accomplished: "🎉",
      frustrated: "😤"
    };
    return emojis[mood] || "😊";
  };

  return (
    <Card className="bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-pink-900">
          <Heart className="w-5 h-5" />
          AI Mood Coach
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!journeyData || journeyData.length < 3 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 mb-2">
              Complete {3 - (journeyData?.length || 0)} more sessions to unlock personalized mood insights!
            </p>
            <Badge variant="outline" className="bg-pink-100 text-pink-700">
              {journeyData?.length || 0} / 3 sessions
            </Badge>
          </div>
        ) : !moodInsights ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 mb-4">
              Get personalized insights on how your moods affect focus performance
            </p>
            <Button
              onClick={analyzeMoodPatterns}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Your Moods...
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 mr-2" />
                  Analyze My Mood Patterns
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
            <div className="p-3 bg-white rounded-lg border border-pink-200">
              <p className="text-xs font-semibold text-pink-900 mb-1">Your Mood Journey:</p>
              <p className="text-sm text-gray-700">{moodInsights.insights_summary}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-lg text-center">
                <TrendingUp className="w-4 h-4 mx-auto mb-1 text-green-600" />
                <p className="text-xs text-gray-600">Mood Improvement</p>
                <p className="text-lg font-bold text-green-900">{Math.round(moodInsights.mood_improvement_rate)}%</p>
              </div>
              <div className="p-3 bg-white rounded-lg text-center">
                <Heart className="w-4 h-4 mx-auto mb-1 text-pink-600" />
                <p className="text-xs text-gray-600">Management Score</p>
                <p className="text-lg font-bold text-pink-900">{moodInsights.mood_management_score}/100</p>
              </div>
            </div>

            {currentMood && moodInsights.current_mood_success_rate !== undefined && (
              <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getMoodEmoji(currentMood)}</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-purple-900">
                      Starting {currentMood} today
                    </p>
                    <p className="text-xs text-purple-700">
                      {Math.round(moodInsights.current_mood_success_rate)}% success rate with this mood
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-700">{moodInsights.current_mood_typical_outcome}</p>
              </div>
            )}

            {moodInsights.pre_session_ritual && (
              <div className="p-3 bg-white rounded-lg border border-pink-200">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-pink-600" />
                  <p className="text-xs font-semibold text-pink-900">Your Pre-Session Ritual:</p>
                </div>
                <p className="text-sm text-gray-700 mb-2">{moodInsights.pre_session_ritual}</p>
                <Badge className="bg-pink-100 text-pink-700 text-xs">
                  Personalized for your mood
                </Badge>
              </div>
            )}

            {moodInsights.best_starting_moods?.length > 0 && (
              <div className="p-3 bg-white rounded-lg">
                <p className="text-xs font-semibold text-gray-900 mb-2">Your Best Starting Moods:</p>
                <div className="flex gap-2 flex-wrap">
                  {moodInsights.best_starting_moods.map((mood, idx) => (
                    <Badge key={idx} variant="outline" className="capitalize">
                      {getMoodEmoji(mood)} {mood}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {moodInsights.successful_transitions?.length > 0 && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs font-semibold text-green-900 mb-2">Your Winning Mood Shifts:</p>
                <div className="space-y-1">
                  {moodInsights.successful_transitions.map((transition, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-green-700">
                      <ArrowRight className="w-3 h-3" />
                      <span>{transition}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                Your Mood Management Strategies:
              </p>
              <ul className="space-y-1">
                {moodInsights.personalized_strategies?.map((strategy, idx) => (
                  <li key={idx} className="text-sm text-gray-700">• {strategy}</li>
                ))}
              </ul>
            </div>

            <Button
              onClick={() => setMoodInsights(null)}
              variant="outline"
              className="w-full"
            >
              Refresh Insights
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}