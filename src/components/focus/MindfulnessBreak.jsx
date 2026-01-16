import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Wind, Heart, X, Play, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MindfulnessBreak({ 
  type = "breathing",
  duration = 180,
  onComplete,
  onSkip
}) {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [currentStep, setCurrentStep] = useState(0);
  const [guidance, setGuidance] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    generateGuidance();
  }, [type]);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsActive(false);
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const generateGuidance = async () => {
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a guided mindfulness exercise for a focus session break.

Type: ${type}
Duration: ${Math.floor(duration / 60)} minutes

Generate step-by-step guidance that is:
- Calming and supportive
- Clear and specific
- Timed appropriately for ${Math.floor(duration / 60)} minutes
- Evidence-based mindfulness practice

For BREATHING: Include inhale/exhale patterns, counts, and focus points
For MEDITATION: Include body awareness, thoughts observation, present moment
For BODY_SCAN: Include progressive relaxation from head to toe

Provide 4-6 distinct steps with timing for each.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            introduction: { type: "string" },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  instruction: { type: "string" },
                  duration_seconds: { type: "number" }
                }
              }
            },
            closing: { type: "string" }
          }
        }
      });

      setGuidance(result);
    } catch (error) {
      console.error("Error generating guidance:", error);
    }
    setIsGenerating(false);
  };

  const getCurrentInstruction = () => {
    if (!guidance?.steps) return "Preparing your mindfulness break...";
    
    let elapsed = duration - timeLeft;
    let cumulative = 0;
    
    for (let i = 0; i < guidance.steps.length; i++) {
      cumulative += guidance.steps[i].duration_seconds;
      if (elapsed < cumulative) {
        return guidance.steps[i].instruction;
      }
    }
    
    return guidance.closing || "Take a final deep breath...";
  };

  const getIcon = () => {
    switch (type) {
      case "breathing": return Wind;
      case "meditation": return Sparkles;
      case "body_scan": return Heart;
      default: return Wind;
    }
  };

  const Icon = getIcon();

  const progress = ((duration - timeLeft) / duration) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <Card className="w-full max-w-md bg-gradient-to-br from-teal-50 to-blue-50 border-teal-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Icon className="w-6 h-6 text-teal-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {isGenerating ? "Preparing..." : guidance?.title || "Mindfulness Break"}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSkip}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {!isActive && !isGenerating && (
              <div className="text-center mb-6">
                <p className="text-sm text-gray-700 mb-4">{guidance?.introduction}</p>
                <Button
                  onClick={() => setIsActive(true)}
                  className="bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Mindfulness Break
                </Button>
              </div>
            )}

            {isActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-teal-400 to-blue-400 rounded-full flex items-center justify-center"
                  >
                    <Icon className="w-10 h-10 text-white" />
                  </motion.div>
                  
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </p>
                  
                  <Progress value={progress} className="h-2 mb-4" />
                  
                  <motion.p
                    key={getCurrentInstruction()}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-base text-gray-700 leading-relaxed px-4"
                  >
                    {getCurrentInstruction()}
                  </motion.p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsActive(!isActive)}
                    variant="outline"
                    className="flex-1"
                  >
                    {isActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {isActive ? "Pause" : "Resume"}
                  </Button>
                  <Button
                    onClick={onSkip}
                    variant="outline"
                    className="flex-1"
                  >
                    Skip Break
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}