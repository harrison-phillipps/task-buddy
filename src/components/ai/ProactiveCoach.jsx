import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, X, TrendingUp, Brain, Target, Zap, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const COACHING_TYPES = {
  PRODUCTIVITY_INSIGHT: "productivity_insight",
  ENCOURAGEMENT: "encouragement",
  BEHAVIOR_TIP: "behavior_tip",
  GOAL_REMINDER: "goal_reminder",
  ENERGY_MANAGEMENT: "energy_management"
};

export default function ProactiveCoach({ 
  userProgress, 
  recentTasks = [],
  recentSessions = [],
  goals = [],
  context = "dashboard",
  userTier = "free"
}) {
  const [coachingTip, setCoachingTip] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!userProgress || isDismissed) return;
    // Free users don't get AI coaching tips
    if (!userTier || userTier === "free") return;

    const sessionKey = 'proactive_coach_shown_' + new Date().toDateString();
    if (sessionStorage.getItem(sessionKey)) return;

    const generateCoachingTip = async () => {
      try {
        const now = new Date();
        const hourOfDay = now.getHours();
        const timeOfDay = hourOfDay < 12 ? "morning" : hourOfDay < 17 ? "afternoon" : "evening";

        const completedTasksToday = recentTasks.filter(t => 
          t.status === 'completed' && 
          new Date(t.updated_date).toDateString() === now.toDateString()
        ).length;

        const focusSessionsToday = recentSessions.filter(s =>
          new Date(s.created_date).toDateString() === now.toDateString()
        ).length;

        const totalFocusMinutes = recentSessions
          .filter(s => new Date(s.created_date).toDateString() === now.toDateString())
          .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

        const pendingTasks = recentTasks.filter(t => t.status !== 'completed').length;
        const highPriorityTasks = recentTasks.filter(t => 
          t.priority === 'urgent' || t.task_priority === 'must_do'
        ).length;

        const prompt = `You are an empathetic ADHD productivity coach analyzing a user's activity in ${context} context.

TIME: ${timeOfDay} (${hourOfDay}:00)
USER LEVEL: ${Math.floor(userProgress.total_points / 200) + 1}
STREAK: ${userProgress.current_streak || 0} days
TOTAL POINTS: ${userProgress.total_points}

TODAY'S ACTIVITY:
- Completed tasks: ${completedTasksToday}
- Focus sessions: ${focusSessionsToday}
- Focus time: ${totalFocusMinutes} minutes
- Pending tasks: ${pendingTasks}
- High priority tasks: ${highPriorityTasks}

RECENT PATTERNS:
- Total tasks completed: ${userProgress.tasks_completed || 0}
- Total focus sessions: ${userProgress.focus_sessions_completed || 0}
- Total focus time: ${userProgress.total_focus_minutes || 0} minutes

GOALS: ${goals.length > 0 ? goals.map(g => `${g.title} (${g.status})`).join(', ') : 'None set'}

Generate ONE proactive coaching tip that is:
1. Contextually relevant to their current time, activity, and patterns
2. Actionable and specific (not generic)
3. Encouraging but realistic
4. Brief (2-3 sentences max)
5. Focused on ONE improvement area`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              type: { type: "string", enum: Object.values(COACHING_TYPES) },
              title: { type: "string" },
              message: { type: "string" },
              actionable: { type: "boolean" },
              action_label: { type: "string" },
              priority: { type: "string", enum: ["low", "medium", "high"] }
            }
          }
        });

        setCoachingTip(result);
        setIsVisible(true);
        sessionStorage.setItem(sessionKey, '1');
      } catch (error) {
        console.error("Error generating coaching tip:", error);
      }
    };

    generateCoachingTip();
  }, [userProgress, isDismissed]);

  const getIcon = () => {
    if (!coachingTip) return Sparkles;
    switch (coachingTip.type) {
      case COACHING_TYPES.PRODUCTIVITY_INSIGHT: return TrendingUp;
      case COACHING_TYPES.ENCOURAGEMENT: return CheckCircle;
      case COACHING_TYPES.BEHAVIOR_TIP: return Brain;
      case COACHING_TYPES.GOAL_REMINDER: return Target;
      case COACHING_TYPES.ENERGY_MANAGEMENT: return Zap;
      default: return Sparkles;
    }
  };

  const getColorClasses = () => {
    if (!coachingTip) return {
      card: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-700",
      icon: "bg-purple-500",
      title: "text-purple-900 dark:text-purple-100",
      dot: "bg-purple-500",
      action: "text-purple-700 dark:text-purple-300"
    };
    switch (coachingTip.priority) {
      case "high": return {
        card: "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-700",
        icon: "bg-red-500",
        title: "text-red-900 dark:text-red-100",
        dot: "bg-red-500",
        action: "text-red-700 dark:text-red-300"
      };
      case "medium": return {
        card: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-orange-200 dark:border-orange-700",
        icon: "bg-orange-500",
        title: "text-orange-900 dark:text-orange-100",
        dot: "bg-orange-500",
        action: "text-orange-700 dark:text-orange-300"
      };
      default: return {
        card: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-700",
        icon: "bg-purple-500",
        title: "text-purple-900 dark:text-purple-100",
        dot: "bg-purple-500",
        action: "text-purple-700 dark:text-purple-300"
      };
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
  };

  if (!coachingTip || !isVisible) return null;

  const Icon = getIcon();
  const colorClasses = getColorClasses();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={`${colorClasses.card} shadow-lg`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-10 h-10 ${colorClasses.icon} rounded-xl flex items-center justify-center shadow-md`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className={`font-bold ${colorClasses.title} text-sm`}>
                    {coachingTip.title}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDismiss}
                    className="h-6 w-6 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3">
                  {coachingTip.message}
                </p>

                {coachingTip.actionable && coachingTip.action_label && (
                  <div className="flex items-center gap-2">
                    <div className={`w-1 h-1 rounded-full ${colorClasses.dot}`} />
                    <span className={`text-xs font-medium ${colorClasses.action}`}>
                      {coachingTip.action_label}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}