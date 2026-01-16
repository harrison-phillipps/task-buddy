import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Wind, Coffee, Move, Droplet, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MindfulnessBreak from "./MindfulnessBreak";

export default function GuidedBreakFlow({ 
  breakConfig,
  onComplete,
  onSkip
}) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showMindfulness, setShowMindfulness] = useState(false);

  const phases = [
    ...(breakConfig.includeMindfulness ? [{
      type: "mindfulness",
      duration: (breakConfig.mindfulnessDuration || 3) * 60,
      title: "Mindfulness Practice",
      icon: Wind
    }] : []),
    {
      type: "activities",
      duration: (breakConfig.duration - (breakConfig.includeMindfulness ? breakConfig.mindfulnessDuration : 0)) * 60,
      title: `${breakConfig.type} Break`,
      icon: breakConfig.type === "physical" ? Move : Coffee,
      activities: breakConfig.activities
    }
  ];

  useEffect(() => {
    if (phases[currentPhase]?.type === "mindfulness") {
      setShowMindfulness(true);
    } else {
      setTimeLeft(phases[currentPhase]?.duration || 0);
    }
  }, [currentPhase]);

  useEffect(() => {
    if (showMindfulness || currentPhase >= phases.length) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handlePhaseComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showMindfulness, currentPhase]);

  const handlePhaseComplete = () => {
    if (currentPhase < phases.length - 1) {
      setCurrentPhase(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showMindfulness) {
    return (
      <MindfulnessBreak
        type={breakConfig.mindfulnessType || "breathing"}
        duration={phases[currentPhase].duration}
        onComplete={() => {
          setShowMindfulness(false);
          handlePhaseComplete();
        }}
        onSkip={() => {
          setShowMindfulness(false);
          handlePhaseComplete();
        }}
      />
    );
  }

  const currentPhaseData = phases[currentPhase];
  if (!currentPhaseData) return null;

  const Icon = currentPhaseData.icon;
  const progress = ((currentPhaseData.duration - timeLeft) / currentPhaseData.duration) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <Card className="w-full max-w-md bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Icon className="w-6 h-6 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900">{currentPhaseData.title}</h3>
              </div>
              {phases.length > 1 && (
                <Badge variant="outline" className="text-xs">
                  {currentPhase + 1}/{phases.length}
                </Badge>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-full flex items-center justify-center"
                >
                  <Icon className="w-10 h-10 text-white" />
                </motion.div>
                
                <p className="text-4xl font-bold text-gray-900 mb-2">
                  {formatTime(timeLeft)}
                </p>
                
                <Progress value={progress} className="h-2 mb-4" />
              </div>

              {currentPhaseData.activities && (
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Break Activities:</p>
                  <div className="space-y-2">
                    {currentPhaseData.activities.map((activity, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>{activity}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {breakConfig.type === "hydration" && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplet className="w-5 h-5 text-blue-600" />
                    <p className="text-sm font-semibold text-blue-900">Hydration Reminder</p>
                  </div>
                  <p className="text-sm text-blue-700">Drink a glass of water to stay refreshed!</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={onSkip}
                  variant="outline"
                  className="flex-1"
                >
                  Skip Break
                </Button>
                <Button
                  onClick={onComplete}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white"
                >
                  Finish Early
                </Button>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}