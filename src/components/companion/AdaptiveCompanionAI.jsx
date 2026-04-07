import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, X, Sparkles, Brain, Lightbulb } from "lucide-react";

const INSIGHT_COOLDOWN_MINUTES = 30;

// Analyze tasks/sessions and build behavioral pattern data
function analyzeBehavior(tasks, sessions, progress) {
  const completedTasks = tasks.filter(t => t.status === "completed");
  const completionRate = tasks.length > 0 ? completedTasks.length / tasks.length : 0;

  // Peak hours from sessions
  const hourCounts = {};
  sessions.forEach(s => {
    if (s.created_date) {
      const hour = new Date(s.created_date).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  });
  const peakHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => parseInt(h));

  // Category preferences
  const catCounts = {};
  tasks.forEach(t => {
    if (t.category) catCounts[t.category] = (catCounts[t.category] || 0) + 1;
  });
  const preferredCategories = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);

  // Avg focus duration
  const avgFocus = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / sessions.length
    : 25;

  return {
    completionRate,
    peakHours,
    preferredCategories,
    avgFocusDuration: Math.round(avgFocus),
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    streak: progress?.current_streak || 0,
    level: progress?.level || 1,
  };
}

// Build a context-aware prompt for the AI
function buildInsightPrompt(behavior, learningProfile, companionType, personality) {
  const styleGuide = learningProfile?.learned_style_prompt || "";
  const toneMap = { formal: "professional and structured", casual: "warm and friendly", playful: "fun and energetic", direct: "brief and to the point" };
  const lengthMap = { short: "1 sentence", medium: "2-3 sentences", long: "3-4 sentences" };
  const tone = toneMap[learningProfile?.preferred_tone || "casual"];
  const length = lengthMap[learningProfile?.preferred_message_length || "medium"];

  return `You are an AI productivity companion (${companionType || "robot"} character) with a ${personality || "motivational"} personality.
The user's behavioral data:
- Task completion rate: ${Math.round(behavior.completionRate * 100)}%
- Peak productive hours: ${behavior.peakHours.map(h => `${h}:00`).join(", ") || "unknown"}
- Favorite categories: ${behavior.preferredCategories.join(", ") || "various"}
- Average focus session: ${behavior.avgFocusDuration} minutes
- Current streak: ${behavior.streak} days
- Level: ${behavior.level}
- Total tasks completed: ${behavior.completedTasks}/${behavior.totalTasks}

${styleGuide ? `Learned communication style for this user: ${styleGuide}` : ""}
Communication style: ${tone}, ${length}.

Generate ONE specific, personalized, actionable productivity insight or suggestion for this user right now.
Make it feel personal and data-driven — reference their actual patterns. 
Do NOT be generic. Do NOT start with "I notice" or "Based on".
Output ONLY the message text, nothing else.`;
}

export default function AdaptiveCompanionAI({ currentUser, tasks = [], sessions = [], progress, className = "" }) {
  const [learningProfile, setLearningProfile] = useState(null);
  const [insight, setInsight] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Load or create the learning profile
  useEffect(() => {
    if (!currentUser?.id) return;
    loadLearningProfile();
  }, [currentUser?.id]);

  // Auto-trigger insight when we have enough data
  useEffect(() => {
    if (!learningProfile || tasks.length < 3) return;
    checkAndTriggerInsight();
  }, [learningProfile, tasks.length]);

  const loadLearningProfile = async () => {
    try {
      const profiles = await base44.entities.CompanionLearning.filter({ user_id: currentUser.id });
      if (profiles.length > 0) {
        setLearningProfile(profiles[0]);
      } else {
        // Create initial profile
        const newProfile = await base44.entities.CompanionLearning.create({ user_id: currentUser.id });
        setLearningProfile(newProfile);
      }
    } catch (e) {
      console.error("AdaptiveCompanionAI: failed to load profile", e);
    }
  };

  const checkAndTriggerInsight = useCallback(async () => {
    if (!learningProfile) return;
    const lastInsight = learningProfile.last_insight_at;
    if (lastInsight) {
      const minutesSince = (Date.now() - new Date(lastInsight).getTime()) / 60000;
      if (minutesSince < INSIGHT_COOLDOWN_MINUTES) return;
    }
    await generateInsight();
  }, [learningProfile, tasks, sessions, progress]);

  const generateInsight = async () => {
    if (isLoading || !currentUser) return;
    setIsLoading(true);
    try {
      const behavior = analyzeBehavior(tasks, sessions, progress);
      const prompt = buildInsightPrompt(behavior, learningProfile, currentUser.companion_type, currentUser.companion_personality);

      const message = await base44.integrations.Core.InvokeLLM({ prompt });

      if (!isMounted.current) return;

      // Update behavioral data in learning profile
      const updates = {
        completion_rate: behavior.completionRate,
        peak_productivity_hours: behavior.peakHours,
        preferred_task_categories: behavior.preferredCategories,
        avg_focus_duration_minutes: behavior.avgFocusDuration,
        last_insight_at: new Date().toISOString(),
        interaction_count: (learningProfile?.interaction_count || 0) + 1,
        behavioral_patterns: behavior,
      };

      const updated = await base44.entities.CompanionLearning.update(learningProfile.id, updates);
      setLearningProfile(updated);
      setInsight(message);
      setIsVisible(true);
    } catch (e) {
      console.error("AdaptiveCompanionAI: insight generation failed", e);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  const handleFeedback = async (positive) => {
    if (!learningProfile) return;
    try {
      const updates = {
        positive_responses: (learningProfile.positive_responses || 0) + (positive ? 1 : 0),
        dismissed_count: (learningProfile.dismissed_count || 0) + (positive ? 0 : 1),
        effective_motivators: positive
          ? [...(learningProfile.effective_motivators || []), currentUser?.companion_personality || "motivational"]
          : learningProfile.effective_motivators,
      };

      // After 5+ interactions, ask AI to derive a learned style
      const totalInteractions = (learningProfile.interaction_count || 0);
      if (totalInteractions > 0 && totalInteractions % 5 === 0) {
        const stylePrompt = `Based on these user preferences — positive responses: ${updates.positive_responses}, dismissed: ${updates.dismissed_count}, effective styles: ${(updates.effective_motivators || []).join(", ")} — write a 1-sentence style instruction for an AI companion to follow when talking to this user. Be specific about tone, length, and approach.`;
        const learnedStyle = await base44.integrations.Core.InvokeLLM({ prompt: stylePrompt });
        updates.learned_style_prompt = learnedStyle;
      }

      const updated = await base44.entities.CompanionLearning.update(learningProfile.id, updates);
      setLearningProfile(updated);
    } catch (e) {
      console.error("AdaptiveCompanionAI: feedback update failed", e);
    }
    setIsVisible(false);
    setInsight(null);
  };

  const getCompanionEmoji = () => {
    const map = { cat: "🐱", dog: "🐶", orb: "🔮", robot: "🤖" };
    return map[currentUser?.companion_type] || "🤖";
  };

  if (!currentUser?.companion_type) return null;

  return (
    <div className={className}>
      {/* Manual trigger button */}
      {!isVisible && (
        <Button
          variant="outline"
          size="sm"
          onClick={generateInsight}
          disabled={isLoading}
          className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Brain className="w-4 h-4" />
          )}
          {isLoading ? "Analyzing..." : "Get Insight"}
        </Button>
      )}

      {/* Insight card */}
      <AnimatePresence>
        {isVisible && insight && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.3 }}
            className="mt-3 bg-gradient-to-br from-purple-50 to-teal-50 dark:from-purple-900/30 dark:to-teal-900/30 border border-purple-200 dark:border-purple-700 rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-xl">{getCompanionEmoji()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Personalized Insight</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{insight}</p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => handleFeedback(true)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 transition-colors"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" /> Helpful
                  </button>
                  <button
                    onClick={() => handleFeedback(false)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" /> Not helpful
                  </button>
                  <button
                    onClick={() => { setIsVisible(false); setInsight(null); }}
                    className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            {learningProfile && (
              <div className="mt-3 pt-3 border-t border-purple-100 dark:border-purple-800 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> {learningProfile.interaction_count || 0} interactions</span>
                {learningProfile.learned_style_prompt && (
                  <span className="text-purple-400">✦ Style adapted</span>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}