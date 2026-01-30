import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Brain, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AIOnboardingAssistant({ 
  userResponses, 
  currentStep, 
  onSuggestions 
}) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (userResponses && Object.keys(userResponses).length >= 2) {
      analyzeUserProfile();
    }
  }, [userResponses]);

  const analyzeUserProfile = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = `You are an empathetic ADHD productivity coach analyzing a new user's onboarding responses.

USER PROFILE:
- Display Name: ${userResponses.displayName || "Not provided"}
- Primary Goals: ${userResponses.primaryGoals?.join(", ") || "Not specified"}
- Main Challenge: ${userResponses.mainChallenge || "Not specified"}
- Work Style: ${userResponses.workStyle || "Not specified"}
- Current Mood: ${userResponses.currentMood || "Not specified"}

Based on their profile, provide:

1. **Personalized Welcome**: Warm, specific greeting acknowledging their unique situation
2. **Key Insights**: 2-3 observations about their needs and how the app can help
3. **Recommended First Steps**: 3-4 specific, ordered actions they should take today
4. **Suggested Initial Goals**: 2-3 realistic goals that match their objectives
5. **Starter Tasks**: 3-5 tasks they can add right now to get started
6. **Companion Recommendation**: Which companion type suits their personality (cat, dog, robot, orb)
7. **Motivational Message**: Personalized encouragement for their journey

Make it warm, specific, and actionable. Use their exact challenges and goals in your response.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            welcome_message: { type: "string" },
            key_insights: {
              type: "array",
              items: { type: "string" }
            },
            first_steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  why: { type: "string" }
                }
              }
            },
            suggested_goals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  type: { type: "string" }
                }
              }
            },
            starter_tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  category: { type: "string" },
                  difficulty: { type: "string" }
                }
              }
            },
            companion_recommendation: {
              type: "object",
              properties: {
                type: { 
                  type: "string",
                  enum: ["cat", "dog", "robot", "orb"]
                },
                reason: { type: "string" }
              }
            },
            motivation: { type: "string" }
          }
        }
      });

      setAnalysis(result);
      if (onSuggestions) {
        onSuggestions(result);
      }
    } catch (error) {
      console.error("Error analyzing user profile:", error);
    }
    setIsAnalyzing(false);
  };

  if (isAnalyzing) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Card className="bg-gradient-to-br from-purple-50 to-teal-50 border-purple-200">
          <CardContent className="p-6 text-center">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-700 font-medium">
              Analyzing your profile...
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Creating your personalized experience
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!analysis) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="bg-gradient-to-br from-purple-50 to-teal-50 border-purple-200 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-purple-900 mb-2">Your Personalized Plan</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {analysis.welcome_message}
              </p>
            </div>
          </div>

          {analysis.key_insights?.length > 0 && (
            <div className="mb-4 p-3 bg-white rounded-lg border border-purple-100">
              <h4 className="text-xs font-semibold text-purple-900 uppercase mb-2">
                Key Insights
              </h4>
              <ul className="space-y-1">
                {analysis.key_insights.map((insight, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">✨</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.motivation && (
            <div className="p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
              <p className="text-sm text-gray-800 italic">
                💜 {analysis.motivation}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}