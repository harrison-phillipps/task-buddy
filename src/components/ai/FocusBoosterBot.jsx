import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, X, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FocusBoosterBot({ 
  currentTask, 
  timeLeft, 
  isActive, 
  moodBefore, 
  sessionDuration,
  showBot = true,
  onDismiss 
}) {
  const [tip, setTip] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastTipTime, setLastTipTime] = useState(0);

  // No auto-trigger — user must click "Get focus tip"

  const generateTip = async () => {
    setIsLoading(true);
    try {
      const minutesElapsed = sessionDuration ? Math.round((sessionDuration - timeLeft) / 60) : 0;
      const percentComplete = sessionDuration ? Math.round(((sessionDuration - timeLeft) / sessionDuration) * 100) : 0;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You're a Focus Booster Bot - a real-time productivity coach during focus sessions.

Current session context:
- Task: "${currentTask?.title}"
- Time left: ${Math.floor(timeLeft / 60)} minutes
- Time elapsed: ${minutesElapsed} minutes
- Session progress: ${percentComplete}%
- Starting mood: ${moodBefore || 'neutral'}
- Currently active: ${isActive}

Provide ONE actionable focus tip based on:
- Session progress (beginning/middle/end)
- Time remaining
- User's starting mood
- Task type

Guidelines:
- Keep it brief (1-2 sentences max)
- Be encouraging and positive
- Provide practical, immediate actions
- Match energy to session phase (energizing at start, sustaining in middle, motivating near end)
- NO generic advice - be specific to THIS moment

Return just the tip text.`,
        response_json_schema: {
          type: "object",
          properties: {
            tip: { type: "string" },
            emoji: { type: "string" }
          }
        }
      });

      setTip(result);
      setLastTipTime(Date.now());
    } catch (error) {
      console.error("Focus bot error:", error);
    }
    setIsLoading(false);
  };

  if (!showBot) return null;

  return (
    <AnimatePresence>
      {!tip && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            onClick={generateTip}
            className="bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg"
          >
            <Zap className="w-4 h-4 mr-2" />
            Get focus tip
          </Button>
        </motion.div>
      )}
      {(tip || isLoading) && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 max-w-sm z-50"
        >
          <Card className="bg-gradient-to-br from-orange-50 to-pink-50 border-orange-200 shadow-2xl">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-orange-900 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Focus Boost
                    </p>
                    {isLoading ? (
                      <p className="text-sm text-orange-700">Getting you a tip...</p>
                    ) : (
                      <p className="text-sm text-orange-900">
                        {tip?.emoji} {tip?.tip}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="text-orange-600 hover:bg-orange-100 h-6 w-6 p-0 flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}