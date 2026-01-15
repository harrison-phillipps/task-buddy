import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trophy, Target, TrendingUp, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function HabitFormationBot({ recurringTasks, userProgress }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);
  const [showBot, setShowBot] = useState(true);

  useEffect(() => {
    // Auto-analyze on mount if there are recurring tasks
    if (recurringTasks?.length > 0 && !insights) {
      analyzeHabits();
    }
  }, []);

  const analyzeHabits = async () => {
    setIsAnalyzing(true);
    try {
      const habitData = recurringTasks.map(task => ({
        title: task.title,
        pattern: task.recurrence_pattern,
        status: task.status,
        completed_subtasks: task.subtasks?.filter(st => st.completed).length || 0,
        total_subtasks: task.subtasks?.length || 0,
        is_due_today: task.due_date === new Date().toISOString().split('T')[0]
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You're a Habit Formation Bot - an expert at helping people build consistent habits through recurring tasks.

User's recurring tasks:
${JSON.stringify(habitData, null, 2)}

User stats:
- Current streak: ${userProgress?.current_streak || 0} days
- Level: ${userProgress?.level || 1}
- Tasks completed: ${userProgress?.tasks_completed || 0}

Provide:
1. A personalized encouragement message (1-2 sentences, warm and motivating)
2. Current habit strength assessment (beginner/building/established/mastery)
3. One specific tip to improve habit consistency
4. Streak milestone goal (what streak to aim for next)
5. Quick win suggestion (which task to complete today for momentum)

Be personal, encouraging, and focus on progress over perfection!`,
        response_json_schema: {
          type: "object",
          properties: {
            encouragement: { type: "string" },
            habit_strength: { type: "string" },
            consistency_tip: { type: "string" },
            next_milestone: { type: "number" },
            quick_win_task: { type: "string" }
          }
        }
      });

      setInsights(result);
    } catch (error) {
      console.error("Habit bot error:", error);
    }
    setIsAnalyzing(false);
  };

  if (!showBot || !recurringTasks?.length) return null;

  const getStreakColor = () => {
    const streak = userProgress?.current_streak || 0;
    if (streak >= 30) return "from-purple-500 to-pink-500";
    if (streak >= 14) return "from-blue-500 to-purple-500";
    if (streak >= 7) return "from-green-500 to-blue-500";
    return "from-orange-500 to-yellow-500";
  };

  return (
    <Card className="bg-gradient-to-br from-green-50 to-teal-50 border-green-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-green-900">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
            Habit Formation Coach
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBot(false)}
            className="text-green-600"
          >
            ✕
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`p-4 bg-gradient-to-r ${getStreakColor()} rounded-xl text-white`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Current Streak</span>
            <Trophy className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold">{userProgress?.current_streak || 0} days 🔥</p>
        </div>

        <AnimatePresence mode="wait">
          {isAnalyzing && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-6"
            >
              <Loader2 className="w-8 h-8 animate-spin text-green-500 mx-auto mb-3" />
              <p className="text-sm text-green-600">Analyzing your habits...</p>
            </motion.div>
          )}

          {insights && !isAnalyzing && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="p-3 bg-white rounded-lg border border-green-200">
                <p className="text-sm text-green-900">{insights.encouragement}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-lg border border-green-200">
                  <p className="text-xs text-green-600 mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Habit Strength
                  </p>
                  <Badge className="bg-green-500 text-white capitalize">
                    {insights.habit_strength}
                  </Badge>
                </div>
                <div className="p-3 bg-white rounded-lg border border-green-200">
                  <p className="text-xs text-green-600 mb-1 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Next Goal
                  </p>
                  <p className="text-lg font-bold text-green-900">
                    {insights.next_milestone} days
                  </p>
                </div>
              </div>

              {insights.consistency_tip && (
                <div className="p-3 bg-green-100 rounded-lg">
                  <p className="text-xs font-semibold text-green-900 mb-1">💪 Consistency Tip:</p>
                  <p className="text-sm text-green-800">{insights.consistency_tip}</p>
                </div>
              )}

              {insights.quick_win_task && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-xs font-semibold text-yellow-900 mb-1">⚡ Quick Win Today:</p>
                  <p className="text-sm text-yellow-800">{insights.quick_win_task}</p>
                </div>
              )}

              <Button
                onClick={analyzeHabits}
                variant="outline"
                size="sm"
                className="w-full border-green-300 text-green-700 hover:bg-green-50"
              >
                <RefreshCw className="w-3 h-3 mr-2" />
                Refresh Insights
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {!insights && !isAnalyzing && (
          <Button
            onClick={analyzeHabits}
            className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white"
          >
            <Target className="w-4 h-4 mr-2" />
            Analyze My Habits
          </Button>
        )}
      </CardContent>
    </Card>
  );
}