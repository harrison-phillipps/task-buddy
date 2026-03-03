import React, { useState, useEffect } from "react";
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
  pauseCount = 0
}) {
  const [tip, setTip] = useState(null);
  const [lastTipTime, setLastTipTime] = useState(Date.now());

  useEffect(() => {
    const generateSessionTip = async () => {
      try {
        const progressPercent = (elapsedMinutes / sessionDuration) * 100;
        const completedSubtasks = task?.subtasks?.filter(s => s.completed).length || 0;
        const totalSubtasks = task?.subtasks?.length || 0;

        const prompt = `You are a real-time ADHD focus coach monitoring an active work session.

SESSION STATUS:
- Task: ${task?.title || "Focus session"}
- Difficulty: ${task?.difficulty || "medium"}
- Progress: ${progressPercent.toFixed(0)}% (${elapsedMinutes}/${sessionDuration} min)
- Subtasks: ${completedSubtasks}/${totalSubtasks} completed
- Current mood: ${mood || "not specified"}
- Pause count: ${pauseCount}

Generate ONE brief, real-time coaching tip (1-2 sentences) that:
1. Acknowledges current progress
2. Provides specific encouragement or micro-strategy
3. Is contextual to the session phase (start/middle/ending)
4. Matches their mood and pause patterns

Examples:
- If early in session: "Great start! Try the first subtask before checking anything else."
- If paused multiple times: "Those breaks show self-awareness. One more focused push!"
- If nearing end: "You're almost there! Finish strong for that completion boost."
- If struggling: "Take 2 deep breaths. Progress over perfection today."

Be brief, warm, and action-focused.`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              icon: {
                type: "string",
                enum: ["brain", "target", "clock", "zap", "heart", "sparkles"]
              },
              timing: {
                type: "string",
                enum: ["immediate", "next_milestone"]
              }
            }
          }
        });

        setTip(result);
        setLastTipTime(Date.now());
      } catch (error) {
        console.error("Error generating session tip:", error);
      }
    };

    // Generate tip at key moments: start, 25%, 50%, 75%, near end
    const progressPercent = sessionDuration > 0 ? (elapsedMinutes / sessionDuration) * 100 : 0;
    const timeSinceLastTip = Date.now() - lastTipTime;
    const shouldGenerateTip = 
      elapsedMinutes === 1 || // Start
      (progressPercent >= 25 && progressPercent < 30 && timeSinceLastTip > 60000) ||
      (progressPercent >= 50 && progressPercent < 55 && timeSinceLastTip > 60000) ||
      (progressPercent >= 75 && progressPercent < 80 && timeSinceLastTip > 60000) ||
      (progressPercent >= 90 && timeSinceLastTip > 60000) ||
      pauseCount > 0; // After pause

    if (shouldGenerateTip) {
      generateSessionTip();
    }
  }, [elapsedMinutes, sessionDuration, pauseCount, task, mood]);

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

  if (!tip) return null;

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