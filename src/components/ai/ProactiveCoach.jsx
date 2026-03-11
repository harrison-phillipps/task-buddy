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
  context = "dashboard"
}) {
  const [coachingTip, setCoachingTip] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!userProgress || isDismissed) return;

    // Only generate once per session
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
5. Focused on ONE improvement area

Consider:
- If they have high streak, celebrate and suggest next challenge
- If it's morning and no tasks done, suggest starting with an easy win
- If lots of pending tasks, suggest prioritization
- If low focus time but many tasks, suggest quality over quantity
- If evening with unfinished urgent tasks, offer gentle accountability
- If they're crushing it, acknowledge and suggest sustainability tips

Choose the most relevant coaching type and provide specific advice.`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: Object.values(COACHING_TYPES)
              },
              title: { type: "string" },
              message: { type: "string" },
              actionable: { type: "boolean" },
              action_label: { type: "string" },
              priority: {
                type: "string",
                enum: ["low", "medium", "high"]
              }
            }
          }
        });

        setCoachingTip(result);
        setIsVisible(true);
      } catch (error) {
        console.error("Error generating coaching tip:", error);
      }
    };

    // Generate tip on mount and every 5 minutes
    generateCoachingTip();
    const interval = setInterval(generateCoachingTip, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userProgress, recentTasks, recentSessions, goals, context, isDismissed]);

  const getIcon = () => {
    if (!coachingTip) return Sparkles;
    
    switch (coachingTip.type) {
      case COACHING_TYPES.PRODUCTIVITY_INSIGHT:
        return TrendingUp;
      case COACHING_TYPES.ENCOURAGEMENT:
        return CheckCircle;
      case COACHING_TYPES.BEHAVIOR_TIP:
        return Brain;
      case COACHING_TYPES.GOAL_REMINDER:
        return Target;
      case COACHING_TYPES.ENERGY_MANAGEMENT:
        return Zap;
      default:
        return Sparkles;
    }
  };

  const getColor = () => {
    if (!coachingTip) return "purple";
    
    switch (coachingTip.priority) {
      case "high":
        return "red";
      case "medium":
        return "orange";
      default:
        return "purple";
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
  };

  if (!coachingTip || !isVisible) return null;

  const Icon = getIcon();
  const color = getColor();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={`bg-gradient-to-br from-${color}-50 to-${color}-100 border-${color}-200 shadow-lg`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-10 h-10 bg-${color}-500 rounded-xl flex items-center justify-center shadow-md`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className={`font-bold text-${color}-900 text-sm`}>
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
                
                <p className="text-gray-700 text-sm leading-relaxed mb-3">
                  {coachingTip.message}
                </p>

                {coachingTip.actionable && coachingTip.action_label && (
                  <div className="flex items-center gap-2">
                    <div className={`w-1 h-1 rounded-full bg-${color}-500`} />
                    <span className={`text-xs font-medium text-${color}-700`}>
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