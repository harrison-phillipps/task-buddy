import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, Clock, Target, Zap, TrendingUp, Sparkles, Brain, ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";

const moodEmojis = {
  accomplished: "🎉",
  frustrated: "😤",
  tired: "😴",
  energized: "⚡",
  neutral: "😐",
  focused: "🎯",
  anxious: "😰"
};

export default function PostSessionSummary({ 
  sessionData, 
  goalData,
  onClose,
  onStartNew 
}) {
  const {
    taskTitle,
    subtasksCompleted,
    totalSubtasks,
    totalMinutes,
    moodBefore,
    moodAfter,
    pomodorosCompleted,
    focusTechnique,
    allStepsComplete
  } = sessionData;

  const { goalType, goalValue, goalAchieved, actualValue } = goalData || {};

  const getGoalProgress = () => {
    if (!goalType || !goalValue) return null;
    const progress = Math.min((actualValue / goalValue) * 100, 100);
    return progress;
  };

  const getMoodInsight = () => {
    if (moodBefore === moodAfter) return "Your mood stayed consistent throughout the session.";
    
    const positiveAfter = ['accomplished', 'energized', 'focused'].includes(moodAfter);
    const negativeAfter = ['frustrated', 'tired', 'anxious'].includes(moodAfter);
    const positiveBefore = ['energized', 'focused'].includes(moodBefore);
    
    if (positiveBefore && negativeAfter) {
      return "Consider shorter sessions or more breaks next time.";
    }
    if (!positiveBefore && positiveAfter) {
      return "Great improvement! Starting is often the hardest part.";
    }
    if (positiveAfter) {
      return "Excellent! Your focus strategy is working well.";
    }
    return "Try different techniques or times of day for better results.";
  };

  const getProductivityTip = () => {
    const tips = [];
    
    if (subtasksCompleted === 0) {
      tips.push("Try starting with smaller, easier subtasks to build momentum.");
    } else if (subtasksCompleted === totalSubtasks) {
      tips.push("Amazing job completing everything! Consider tackling a harder task next.");
    }
    
    if (focusTechnique === "pomodoro" && pomodorosCompleted >= 4) {
      tips.push("Take a longer 15-20 minute break after 4 pomodoros.");
    }
    
    if (moodAfter === "tired") {
      tips.push("Schedule demanding tasks earlier when energy is higher.");
    }
    
    if (moodAfter === "frustrated") {
      tips.push("Break down complex tasks into even smaller steps.");
    }

    return tips[0] || "Keep up the great work! Consistency is key.";
  };

  const goalProgress = getGoalProgress();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      {/* Main Summary Card */}
      <Card className="bg-gradient-to-br from-purple-50 via-white to-teal-50 dark:from-purple-900/20 dark:via-gray-800 dark:to-teal-900/20 border-purple-200 dark:border-gray-700 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200 to-teal-200 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
        
        <CardHeader className="text-center relative">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mx-auto mb-4"
          >
            {allStepsComplete ? (
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
            )}
          </motion.div>
          
          <CardTitle className="text-2xl font-bold">
            {allStepsComplete ? "Task Complete! 🎉" : "Great Session!"}
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{taskTitle}</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-700/50 p-3 rounded-xl border border-purple-100 dark:border-gray-600 text-center"
            >
              <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{subtasksCompleted}/{totalSubtasks}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Steps Done</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-700/50 p-3 rounded-xl border border-purple-100 dark:border-gray-600 text-center"
            >
              <Clock className="w-5 h-5 text-teal-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalMinutes}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Minutes</p>
            </motion.div>

            {focusTechnique === "pomodoro" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-gray-700/50 p-3 rounded-xl border border-orange-100 dark:border-gray-600 text-center"
              >
                <span className="text-xl">🍅</span>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pomodorosCompleted}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pomodoros</p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-700/50 p-3 rounded-xl border border-purple-100 dark:border-gray-600 text-center"
            >
              <TrendingUp className="w-5 h-5 text-purple-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {totalSubtasks > 0 ? Math.round((subtasksCompleted / totalSubtasks) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Progress</p>
            </motion.div>
          </div>

          {/* Goal Progress */}
          {goalType && goalValue && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={`p-4 rounded-xl border ${
                goalAchieved 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                  : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className={`w-5 h-5 ${goalAchieved ? 'text-green-600' : 'text-orange-600'}`} />
                  <span className="font-semibold text-gray-800 dark:text-gray-200">Session Goal</span>
                </div>
                <Badge className={goalAchieved ? 'bg-green-500' : 'bg-orange-500'}>
                  {goalAchieved ? '✓ Achieved!' : 'Keep Going!'}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {goalType === "subtasks" && `Complete ${goalValue} steps`}
                    {goalType === "time" && `Focus for ${goalValue} minutes`}
                    {goalType === "pomodoros" && `Complete ${goalValue} pomodoros`}
                  </span>
                  <span className="font-medium">
                    {actualValue}/{goalValue}
                  </span>
                </div>
                <Progress value={goalProgress} className="h-2" />
              </div>
            </motion.div>
          )}

          {/* Mood Journey */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-4 bg-white dark:bg-gray-700/50 rounded-xl border border-purple-100 dark:border-gray-600"
          >
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-purple-500" />
              <span className="font-semibold text-gray-800 dark:text-gray-200">Mood Journey</span>
            </div>
            
            <div className="flex items-center justify-center gap-4 mb-3">
              <div className="text-center">
                <span className="text-3xl">{moodEmojis[moodBefore] || '😐'}</span>
                <p className="text-xs text-gray-500 capitalize mt-1">{moodBefore}</p>
              </div>
              <ArrowRight className="w-6 h-6 text-gray-400" />
              <div className="text-center">
                <span className="text-3xl">{moodEmojis[moodAfter] || '😐'}</span>
                <p className="text-xs text-gray-500 capitalize mt-1">{moodAfter}</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg">
              {getMoodInsight()}
            </p>
          </motion.div>

          {/* AI Tip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Productivity Tip</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{getProductivityTip()}</p>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Back to Dashboard
            </Button>
            <Button
              onClick={onStartNew}
              className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 text-white"
            >
              Start New Session
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}