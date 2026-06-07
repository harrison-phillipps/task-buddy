import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, TrendingUp, Brain, ArrowRight, Zap, Target } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import SessionCelebration from "./SessionCelebration";
import StreakDisplay from "./StreakDisplay";

const moodEmojis = {
  accomplished: "🎉", frustrated: "😤", tired: "😴",
  energized: "⚡", neutral: "😐", focused: "🎯", anxious: "😰",
};

const categoryEmojis = {
  work: "💼", personal: "🌟", health: "💪", creative: "🎨",
  learning: "📚", household: "🏠", other: "✨",
};

function getMoodInsight(moodBefore, moodAfter) {
  if (moodBefore === moodAfter) return "Your mood stayed consistent throughout the session.";
  const positiveAfter = ["accomplished", "energized", "focused"].includes(moodAfter);
  const positiveBefore = ["energized", "focused"].includes(moodBefore);
  if (positiveBefore && !positiveAfter) return "Consider shorter sessions or more breaks next time.";
  if (!positiveBefore && positiveAfter) return "Starting is often the hardest part — and you pushed through.";
  if (positiveAfter) return "Your focus strategy is working well.";
  return "Try a different technique or time of day next session.";
}

function getProductivityTip(subtasksCompleted, totalSubtasks, focusTechnique, pomodorosCompleted, moodAfter) {
  if (subtasksCompleted === totalSubtasks) return "You finished every step. Use this session as your benchmark.";
  if (subtasksCompleted === 0) return "Try starting with the smallest step next time to build momentum.";
  if (focusTechnique === "pomodoro" && pomodorosCompleted >= 4) return "Take a longer 15–20 min break after 4 pomodoros.";
  if (moodAfter === "tired") return "Schedule demanding tasks earlier when energy is higher.";
  if (moodAfter === "frustrated") return "Break complex tasks into even smaller steps.";
  return "Consistency beats perfection — you showed up.";
}

export default function PostSessionSummary({
  sessionData,
  goalData,
  userProgress,
  onClose,
  onStartNew,
}) {
  const {
    taskTitle, taskCategory,
    subtasksCompleted, totalSubtasks,
    totalMinutes, moodBefore, moodAfter,
    pomodorosCompleted, focusTechnique,
    allStepsComplete,
  } = sessionData;

  const { goalType, goalValue, goalAchieved, actualValue } = goalData || {};
  const streak = userProgress?.current_streak || 0;

  const [celebDone, setCelebDone] = useState(false);
  const showCelebration = allStepsComplete && !celebDone;

  const goalProgress = goalType && goalValue
    ? Math.min((actualValue / goalValue) * 100, 100)
    : null;

  const categoryEmoji = categoryEmojis[taskCategory] || "✨";

  return (
    <>
      <SessionCelebration visible={showCelebration} onDone={() => setCelebDone(true)} />

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: celebDone || !allStepsComplete ? 1 : 0, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="space-y-5 pb-6"
      >
        {/* Hero completion card */}
        <div className="rounded-3xl bg-gradient-to-br from-purple-600 via-purple-700 to-teal-600 p-6 text-white text-center shadow-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12)_0%,_transparent_60%)]" />

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.2 }}
            className="text-6xl mb-3 relative z-10"
          >
            {categoryEmoji}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-bold mb-1 relative z-10"
          >
            {allStepsComplete ? "All done." : "Great session."}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-purple-200 text-sm mb-4 relative z-10 truncate max-w-xs mx-auto"
          >
            {taskTitle}
          </motion.p>

          {/* One-line stat */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm font-medium relative z-10"
          >
            <span>{subtasksCompleted}/{totalSubtasks} steps</span>
            <span className="opacity-60">·</span>
            <span>{totalMinutes} min</span>
            {moodBefore && (
              <>
                <span className="opacity-60">·</span>
                <span>{moodEmojis[moodBefore] || "😐"} → {moodEmojis[moodAfter] || "😐"}</span>
              </>
            )}
          </motion.div>

          {/* Streak */}
          {streak > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="mt-5 relative z-10"
            >
              <StreakDisplay streak={streak} justCompleted={true} />
            </motion.div>
          )}
        </div>

        {/* Mood insight */}
        {moodBefore && moodAfter && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-purple-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Mood journey</span>
            </div>
            <div className="flex items-center justify-center gap-4 mb-3">
              <div className="text-center">
                <span className="text-3xl">{moodEmojis[moodBefore] || "😐"}</span>
                <p className="text-xs text-gray-400 capitalize mt-1">{moodBefore}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300" />
              <div className="text-center">
                <span className="text-3xl">{moodEmojis[moodAfter] || "😐"}</span>
                <p className="text-xs text-gray-400 capitalize mt-1">{moodAfter}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2">
              {getMoodInsight(moodBefore, moodAfter)}
            </p>
          </motion.div>
        )}

        {/* Goal progress */}
        {goalType && goalValue && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className={`p-4 rounded-2xl border ${
              goalAchieved
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className={`w-4 h-4 ${goalAchieved ? "text-green-600" : "text-orange-500"}`} />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Session goal</span>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                goalAchieved ? "bg-green-500 text-white" : "bg-orange-400 text-white"
              }`}>
                {goalAchieved ? "✓ Achieved" : "Keep going"}
              </span>
            </div>
            <Progress value={goalProgress} className="h-1.5" />
            <p className="text-xs text-gray-500 mt-1.5 text-right">{actualValue}/{goalValue}</p>
          </motion.div>
        )}

        {/* Productivity tip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800"
        >
          <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {getProductivityTip(subtasksCompleted, totalSubtasks, focusTechnique, pomodorosCompleted, moodAfter)}
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex gap-3 pt-1"
        >
          <Button variant="outline" onClick={onClose} className="flex-1">
            Back to Dashboard
          </Button>
          <Button
            onClick={onStartNew}
            className="flex-1 bg-gradient-to-r from-purple-600 to-teal-500 text-white font-semibold"
          >
            Start New Session
          </Button>
        </motion.div>
      </motion.div>
    </>
  );
}