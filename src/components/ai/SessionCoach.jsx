import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Brain, Target, Clock, Zap, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SessionCoach({ 
  task,
  sessionDuration,
  currentProgress,
  elapsedMinutes,
  mood,
  pauseCount = 0,
  isOverDailyAILimit = false
}) {
  const [tip, setTip] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateSessionTip = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const progressPercent = (elapsedMinutes / sessionDuration) * 100;
      const completedSubtasks = task?.subtasks?.filter(s => s.completed).length || 0;
      const totalSubtasks = task?.subtasks?.length || 0;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a real-time ADHD focus coach monitoring an active work session.

SESSION STATUS:
- Task: ${task?.title || "Focus session"}
- Difficulty: ${task?.difficulty || "medium"}
- Progress: ${progressPercent.toFixed(0)}% (${elapsedMinutes}/${sessionDuration} min)
- Subtasks: ${completedSubtasks}/${totalSubtasks} completed
- Current mood: ${mood || "not specified"}
- Pause count: ${pauseCount}

Generate ONE brief coaching tip (1-2 sentences), contextual to the session phase and mood. Be brief and action-focused.`,
        response_json_schema: {
          type: "object",
          properties: {
            message: { type: "string" },
            icon: { type: "string", enum: ["brain", "target", "clock", "zap", "heart", "sparkles"] }
          }
        }
      });

      setTip(result);
    } catch (error) {
      console.error("Error generating session tip:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIconComponent = () => {
    if (!tip) return Sparkles;
    
    const iconMap = {
      brain: Brain,
      target: Target,
      clock: Clock,
      zap: Zap,
      heart: Heart,
      sparkles: Sparkles
    };
    
    return iconMap[tip.icon] || Sparkles;
  };

  if (isOverDailyAILimit) return (
    <div className="mb-4 flex justify-center">
      <span className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1">
        ✨ Upgrade for AI coaching tips
      </span>
    </div>
  );

  if (!tip) return (
    <div className="mb-4 flex justify-center">
      <Button
        variant="outline"
        size="sm"
        onClick={generateSessionTip}
        disabled={isLoading}
        className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 text-xs"
      >
        {isLoading
          ? <><div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> Getting tip...</>
          : <><Sparkles className="w-3 h-3" /> Get a tip</>}
      </Button>
    </div>
  );

  const Icon = getIconComponent();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className="mb-4"
      >
        <Card className="bg-gradient-to-r from-purple-50 to-teal-50 border-purple-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-teal-500 rounded-lg flex items-center justify-center">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed flex-1">
                {tip.message}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}