import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, X, TrendingUp, Coffee, Zap, Target, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const nudgeTypes = {
  energy_check: {
    icon: Coffee,
    color: "from-orange-500 to-pink-500",
    title: "Energy Check-In"
  },
  productivity_boost: {
    icon: Zap,
    color: "from-yellow-500 to-orange-500",
    title: "Productivity Tip"
  },
  goal_reminder: {
    icon: Target,
    color: "from-purple-500 to-teal-500",
    title: "Goal Focus"
  },
  break_suggestion: {
    icon: Coffee,
    color: "from-blue-500 to-purple-500",
    title: "Break Time?"
  },
  momentum_keeper: {
    icon: TrendingUp,
    color: "from-green-500 to-teal-500",
    title: "Keep Going!"
  },
  time_awareness: {
    icon: Clock,
    color: "from-indigo-500 to-purple-500",
    title: "Time Reminder"
  }
};

export default function AISmartNudge({ userProgress, tasks, sessions, currentUser }) {
  const [nudge, setNudge] = useState(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkForNudge = async () => {
      if (!currentUser || loading) return;

      // Check if we should show a nudge (not too frequently)
      const lastNudge = localStorage.getItem('last_nudge_time');
      const now = Date.now();
      const nudgeInterval = 30 * 60 * 1000; // 30 minutes

      if (lastNudge && now - parseInt(lastNudge) < nudgeInterval) {
        return;
      }

      setLoading(true);

      try {
        // Analyze current context
        const currentHour = new Date().getHours();
        const incompleteTasks = tasks.filter(t => t.status !== 'completed');
        const todaysTasks = incompleteTasks.filter(t => {
          if (!t.due_date) return false;
          return new Date(t.due_date).toDateString() === new Date().toDateString();
        });
        
        const recentSessions = sessions.filter(s => {
          const sessionDate = new Date(s.created_date);
          const today = new Date();
          return sessionDate.toDateString() === today.toDateString();
        });

        const totalFocusToday = recentSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

        // Build context for AI
        const context = {
          time_of_day: currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening',
          total_tasks: incompleteTasks.length,
          urgent_tasks: todaysTasks.length,
          focus_time_today: totalFocusToday,
          current_streak: userProgress?.current_streak || 0,
          user_level: userProgress?.level || 1,
          last_session_time: recentSessions.length > 0 ? recentSessions[0].created_date : null,
          personality: currentUser.companion_personality || 'motivational'
        };

        // Generate nudge
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `You are TaskBuddy's AI companion providing timely nudges to keep users motivated and productive.

Context:
- Time: ${context.time_of_day}
- Tasks remaining: ${context.total_tasks} (${context.urgent_tasks} due today)
- Focus time today: ${context.focus_time_today} minutes
- Current streak: ${context.current_streak} days
- Level: ${context.user_level}
- Personality: ${context.personality}

Generate a personalized nudge that:
1. Acknowledges their current situation
2. Provides actionable advice or encouragement
3. Matches their companion personality (${context.personality})
4. Is brief (max 2 sentences)
5. Chooses the most appropriate nudge type

Consider:
- If they haven't worked much today, encourage them to start
- If they've been productive, celebrate their momentum
- If it's late and they have tasks, suggest priorities
- If they're on a streak, reinforce it
- If energy might be low (afternoon/evening), suggest a break or easy task

Return a nudge type and message.`,
          response_json_schema: {
            type: "object",
            properties: {
              nudge_type: {
                type: "string",
                enum: ["energy_check", "productivity_boost", "goal_reminder", "break_suggestion", "momentum_keeper", "time_awareness"]
              },
              message: { type: "string" },
              action_label: { type: "string" },
              action_type: {
                type: "string",
                enum: ["start_task", "take_break", "view_goals", "start_focus", "none"]
              }
            }
          }
        });

        if (response.message) {
          setNudge(response);
          setVisible(true);
          localStorage.setItem('last_nudge_time', now.toString());
        }
      } catch (error) {
        console.error("Error generating nudge:", error);
      } finally {
        setLoading(false);
      }
    };

    // Check for nudge after initial load
    const timer = setTimeout(checkForNudge, 5000);
    return () => clearTimeout(timer);
  }, [currentUser, tasks, sessions, userProgress]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => setNudge(null), 300);
  };

  const handleAction = () => {
    // Handle actions based on action_type
    if (nudge.action_type === 'start_focus') {
      window.location.href = '/FocusSession';
    } else if (nudge.action_type === 'view_goals') {
      window.location.href = '/Goals';
    } else if (nudge.action_type === 'start_task') {
      window.location.href = '/Tasks';
    }
    handleDismiss();
  };

  if (!nudge || !visible) return null;

  const nudgeConfig = nudgeTypes[nudge.nudge_type] || nudgeTypes.productivity_boost;
  const Icon = nudgeConfig.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="fixed bottom-4 right-4 z-50 max-w-md"
      >
        <Card className={`bg-gradient-to-br ${nudgeConfig.color} border-none shadow-2xl`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-white text-sm">{nudgeConfig.title}</h4>
                  <button
                    onClick={handleDismiss}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-white/90 text-sm leading-relaxed mb-3">
                  {nudge.message}
                </p>
                {nudge.action_type !== "none" && nudge.action_label && (
                  <Button
                    onClick={handleAction}
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm"
                  >
                    {nudge.action_label}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}