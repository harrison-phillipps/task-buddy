import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, RefreshCw, Loader2, Sparkles, Brain, Target, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AITipsSection({ tasks, focusSessions, userProgress }) {
  const [tips, setTips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateTips = async () => {
    setIsLoading(true);

    const completedTasks = tasks.filter(t => t.status === 'completed');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed');

    // Calculate patterns
    const categoryBreakdown = tasks.reduce((acc, t) => {
      const cat = t.category || 'personal';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    const difficultyBreakdown = completedTasks.reduce((acc, t) => {
      const diff = t.difficulty || 'medium';
      acc[diff] = (acc[diff] || 0) + 1;
      return acc;
    }, {});

    const avgSessionLength = focusSessions.length > 0
      ? focusSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / focusSessions.length
      : 0;

    const moodPatterns = focusSessions.reduce((acc, s) => {
      if (s.mood_before) acc.before[s.mood_before] = (acc.before[s.mood_before] || 0) + 1;
      if (s.mood_after) acc.after[s.mood_after] = (acc.after[s.mood_after] || 0) + 1;
      return acc;
    }, { before: {}, after: {} });

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an ADHD productivity coach analyzing a user's productivity data. Generate 4 personalized, actionable tips.

User's Productivity Data:
- Total tasks: ${tasks.length}
- Completed: ${completedTasks.length}
- In progress: ${inProgressTasks.length}
- Overdue: ${overdueTasks.length}
- Current streak: ${userProgress?.current_streak || 0} days
- Longest streak: ${userProgress?.longest_streak || 0} days
- Total focus sessions: ${focusSessions.length}
- Average session length: ${Math.round(avgSessionLength)} minutes
- Categories worked on: ${JSON.stringify(categoryBreakdown)}
- Difficulty completion: ${JSON.stringify(difficultyBreakdown)}
- Mood patterns: ${JSON.stringify(moodPatterns)}

Generate 4 tips that are:
1. Specific to their patterns (not generic)
2. Actionable and concrete
3. Encouraging and ADHD-friendly
4. Based on their actual data

Each tip should have a category: "focus", "planning", "energy", or "motivation"`,
        response_json_schema: {
          type: "object",
          properties: {
            tips: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  actionStep: { type: "string" }
                }
              }
            },
            overallInsight: { type: "string" }
          }
        }
      });

      setTips(result.tips || []);
      setHasGenerated(true);
    } catch (error) {
      console.error("Error generating tips:", error);
      // Fallback tips
      setTips([
        {
          category: "focus",
          title: "Start with a Quick Win",
          description: "Begin your day with an easy task to build momentum.",
          actionStep: "Choose your smallest task first thing tomorrow"
        },
        {
          category: "planning",
          title: "Break Down Big Tasks",
          description: "Large tasks can feel overwhelming. Use the task breakdown feature.",
          actionStep: "Pick one big task and break it into 5-minute chunks"
        },
        {
          category: "energy",
          title: "Match Tasks to Energy",
          description: "Do hard tasks when you have the most energy.",
          actionStep: "Track your energy levels for a week to find patterns"
        },
        {
          category: "motivation",
          title: "Celebrate Small Wins",
          description: "Every completed task is an achievement worth recognizing.",
          actionStep: "Take a moment to acknowledge each completed task"
        }
      ]);
      setHasGenerated(true);
    }

    setIsLoading(false);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'focus': return Brain;
      case 'planning': return Target;
      case 'energy': return Zap;
      case 'motivation': return Sparkles;
      default: return Lightbulb;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'focus': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'planning': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'energy': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'motivation': return 'bg-pink-100 text-pink-700 border-pink-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 via-white to-teal-50 border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-teal-500 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-white" />
            </div>
            AI-Powered Productivity Tips
          </CardTitle>
          <Button
            onClick={generateTips}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="border-purple-200 hover:bg-purple-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : hasGenerated ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Tips
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Tips
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasGenerated && !isLoading ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-gray-600 mb-4">
              Get personalized productivity tips based on your work patterns
            </p>
            <Button
              onClick={generateTips}
              className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze My Patterns
            </Button>
          </div>
        ) : isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
            <p className="text-gray-600">Analyzing your productivity patterns...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {tips.map((tip, index) => {
                const Icon = getCategoryIcon(tip.category);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-xl border ${getCategoryColor(tip.category)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{tip.title}</h4>
                        </div>
                        <p className="text-xs opacity-80 mb-2">{tip.description}</p>
                        <div className="bg-white/50 rounded-lg px-3 py-2">
                          <p className="text-xs font-medium">
                            💡 {tip.actionStep}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}