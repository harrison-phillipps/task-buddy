import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb, TrendingUp, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const tipIcons = {
  streak: TrendingUp,
  focus: Target,
  balance: Zap,
  braindump: Lightbulb,
  energy: Zap,
  overwhelm: Target,
  planning: Target,
  unblock: Zap,
  milestone: TrendingUp,
  encouragement: TrendingUp,
};

export default function ProactiveCoachingTip({ tip, onDismiss, compact = false }) {
  if (!tip) return null;

  const Icon = tipIcons[tip.type] || Lightbulb;
  const isPriority = tip.priority === "high";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={`${
          isPriority 
            ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-orange-200' 
            : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'
        } border-2 shadow-lg`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full ${
                isPriority ? 'bg-gradient-to-br from-orange-400 to-yellow-400' : 'bg-gradient-to-br from-purple-400 to-blue-400'
              } flex items-center justify-center shadow-md`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`font-bold ${
                  isPriority ? 'text-orange-900' : 'text-purple-900'
                } mb-1`}>
                  {tip.title}
                </h4>
                {!compact && (
                  <p className={`text-sm ${
                    isPriority ? 'text-orange-800' : 'text-purple-800'
                  }`}>
                    {tip.message}
                  </p>
                )}
              </div>
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDismiss}
                  className="flex-shrink-0 h-6 w-6 text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}