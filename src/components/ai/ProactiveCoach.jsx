import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, X, TrendingUp, Brain, Target, Zap, CheckCircle, ThumbsUp, ThumbsDown } from "lucide-react";
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
  const [feedbackGiven, setFeedbackGiven] = useState(null); // 'positive' | 'negative'

  const [isGenerating, setIsGenerating] = useState(false);

  const generateCoachingTip = async () => {
    if (!userProgress || isDismissed) return;
    if (!userTier || userTier === "free") return;
    setIsGenerating(true);
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

        // Load negative feedback to avoid surfacing disliked insight types
        let suppressedTypes = [];
        try {
          const user = await base44.auth.me();
          const recentFeedback = await base44.entities.CompanionFeedback.filter(
            { user_id: user.id, rating: "negative" },
            '-created_date',
            20
          );
          // Count negative hits per type; suppress any type with 2+ negatives
          const typeCounts = {};
          recentFeedback.forEach(f => {
            if (f.context) typeCounts[f.context] = (typeCounts[f.context] || 0) + 1;
          });
          suppressedTypes = Object.entries(typeCounts)
            .filter(([, count]) => count >= 2)
            .map(([type]) => type);
        } catch {}

        const availableTypes = Object.values(COACHING_TYPES).filter(t => !suppressedTypes.includes(t));

        const prompt = `You are a sharp, peer-level coach. Direct, specific, treats the user as a capable adult.

CONTEXT: ${timeOfDay} (${hourOfDay}:00)
STREAK: ${userProgress.current_streak || 0} days
TODAY: ${completedTasksToday} tasks done, ${totalFocusMinutes} focus min, ${pendingTasks} pending (${highPriorityTasks} high priority)
ALL-TIME: ${userProgress.tasks_completed || 0} tasks, ${userProgress.total_focus_minutes || 0} focus min

AVOID TYPES: ${suppressedTypes.length > 0 ? suppressedTypes.join(', ') : 'none'}
AVAILABLE TYPES: ${availableTypes.join(', ')}

Generate ONE insight. STRICT RULES:
1. EXACTLY 2 sentences. Not 1, not 3. Two.
2. Sentence 1: lead with the specific data point (number, time, pattern). 
3. Sentence 2: one concrete action for today. No generic advice.
4. Never use the word "just". No corporate wellness language. No exclamation marks.
5. No phrases like "To boost your...", "Remember to...", "Don't forget...", "Great job...", "Try to..."
6. Title: 3–5 words, factual, no hype.

Good: "Your brain peaks at 11am and 5pm. That's your window — use it today."
Good: "You've done ${completedTasksToday} tasks today with ${totalFocusMinutes} focused minutes. One more session before ${hourOfDay < 17 ? 'evening' : 'bed'} keeps the streak alive."
Bad: "Since your peak productive hours are at 11:00 and 5:00, try scheduling a focused household or personal task right before these times to leverage your natural energy peaks."`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              type: { type: "string", enum: availableTypes.length > 0 ? availableTypes : Object.values(COACHING_TYPES) },
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
      } catch (error) {
        console.error("Error generating coaching tip:", error);
      } finally {
        setIsGenerating(false);
      }
  };

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
        card: "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-200 dark:border-blue-700",
        icon: "bg-blue-500",
        title: "text-blue-900 dark:text-blue-100",
        dot: "bg-blue-500",
        action: "text-blue-700 dark:text-blue-300"
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

  const handleFeedback = async (rating) => {
    setFeedbackGiven(rating);
    if (rating === 'negative') {
      // Dismiss after a moment so user sees the confirmation
      setTimeout(() => handleDismiss(), 1200);
    }
    try {
      const user = await base44.auth.me();
      await base44.entities.CompanionFeedback.create({
        user_id: user.id,
        message_text: coachingTip.message,
        context: coachingTip.type, // store insight type so future sessions can suppress it
        rating,
        feedback: "",
        personality_settings: {}
      });
    } catch (error) {
      console.error("Failed to save feedback:", error);
    }
  };

  if (!coachingTip || !isVisible) return (
    <Button
      variant="outline"
      size="sm"
      onClick={generateCoachingTip}
      disabled={isGenerating || !userProgress || !userTier || userTier === "free"}
      className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300"
    >
      {isGenerating
        ? <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        : <Brain className="w-4 h-4" />}
      {isGenerating ? "Generating insight..." : "Get Coaching Insight"}
    </Button>
  );

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
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-1 h-1 rounded-full ${colorClasses.dot}`} />
                    <span className={`text-xs font-medium ${colorClasses.action}`}>
                      {coachingTip.action_label}
                    </span>
                  </div>
                )}

                {/* Inline feedback — captured immediately, feeds suppression logic */}
                <div className="flex items-center gap-2 pt-1 border-t border-black/5">
                  {feedbackGiven === null ? (
                    <>
                      <span className="text-xs text-gray-400 mr-1">Useful?</span>
                      <button
                        onClick={() => handleFeedback('positive')}
                        className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                        title="Yes, helpful"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleFeedback('negative')}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Not for me"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : feedbackGiven === 'positive' ? (
                    <span className="text-xs text-green-600">Noted ✓</span>
                  ) : (
                    <span className="text-xs text-gray-500">Got it — fewer of these.</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}