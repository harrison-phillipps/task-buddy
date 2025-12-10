import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ArrowRight, ArrowLeft, Sparkles, Brain, Play, Award, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const tourSteps = [
  {
    id: "welcome",
    title: "Welcome to TaskBuddy! 🎉",
    description: "Let me show you around! This quick tour will help you get started with managing tasks, staying focused, and earning rewards.",
    icon: Sparkles,
    position: "center",
    actions: [
      { label: "Skip Tour", variant: "outline", action: "skip" },
      { label: "Let's Go!", variant: "default", action: "next" }
    ]
  },
  {
    id: "brain_dump",
    title: "Brain Dump - Your Starting Point 🧠",
    description: "Feeling overwhelmed? Start here! Just dump everything on your mind, and I'll help you organize it into actionable tasks.",
    icon: Brain,
    target: ".brain-dump-card",
    position: "bottom",
    highlight: true,
    page: "Dashboard",
    actions: [
      { label: "Back", variant: "outline", action: "back" },
      { label: "Next", variant: "default", action: "next" }
    ]
  },
  {
    id: "create_task",
    title: "Create Your First Task ✨",
    description: "Tasks can be broken down into small, manageable steps. Click 'Break Down Task' to turn any big task into bite-sized pieces!",
    icon: Sparkles,
    target: ".breakdown-card",
    position: "bottom",
    highlight: true,
    page: "Dashboard",
    actions: [
      { label: "Back", variant: "outline", action: "back" },
      { label: "Next", variant: "default", action: "next" }
    ]
  },
  {
    id: "focus_session",
    title: "Focus Sessions - Work Together 🎯",
    description: "Ready to work? Start a focus session and I'll guide you through each step of your task. We're in this together!",
    icon: Play,
    target: ".focus-card",
    position: "bottom",
    highlight: true,
    page: "Dashboard",
    actions: [
      { label: "Back", variant: "outline", action: "back" },
      { label: "Next", variant: "default", action: "next" }
    ]
  },
  {
    id: "rewards",
    title: "Earn Points & Level Up! 🏆",
    description: "Complete tasks and focus sessions to earn points, level up, and unlock cool rewards like new themes and companions!",
    icon: Award,
    target: ".level-display",
    position: "bottom",
    highlight: true,
    page: "Dashboard",
    actions: [
      { label: "Back", variant: "outline", action: "back" },
      { label: "Next", variant: "default", action: "next" }
    ]
  },
  {
    id: "companion",
    title: "Your Virtual Companion 🤖",
    description: "I'm here to support you every step of the way! I'll cheer you on, give you tips, and celebrate your wins. Let's do this together!",
    icon: Sparkles,
    target: ".companion-container",
    position: "top",
    highlight: true,
    page: "Dashboard",
    actions: [
      { label: "Back", variant: "outline", action: "back" },
      { label: "Start Using TaskBuddy!", variant: "default", action: "complete", highlighted: true }
    ]
  }
];

export default function OnboardingTour({ currentUser, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetPosition, setTargetPosition] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has completed onboarding tour
    if (currentUser && !currentUser.onboarding_tour_completed) {
      // Small delay to ensure page is loaded
      setTimeout(() => setIsActive(true), 1000);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!isActive) return;

    const step = tourSteps[currentStep];
    
    // Navigate to required page if needed
    if (step.page && window.location.pathname !== createPageUrl(step.page)) {
      navigate(createPageUrl(step.page));
    }

    // Calculate target position
    if (step.target) {
      const updatePosition = () => {
        const element = document.querySelector(step.target);
        if (element) {
          const rect = element.getBoundingClientRect();
          setTargetPosition({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          });
        }
      };

      // Update position initially and on scroll/resize
      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    } else {
      setTargetPosition(null);
    }
  }, [currentStep, isActive, navigate]);

  const handleAction = async (action) => {
    if (action === "next") {
      if (currentStep < tourSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    } else if (action === "back") {
      if (currentStep > 0) {
        setCurrentStep(currentStep - 1);
      }
    } else if (action === "skip" || action === "complete") {
      await completeTour();
    }
  };

  const completeTour = async () => {
    setIsActive(false);
    try {
      await base44.auth.updateMe({
        onboarding_tour_completed: true
      });
      if (onComplete) onComplete();
    } catch (error) {
      console.error("Error completing tour:", error);
    }
  };

  if (!isActive) return null;

  const step = tourSteps[currentStep];
  const StepIcon = step.icon;

  const getTooltipPosition = () => {
    if (!targetPosition || step.position === "center") return {};

    const padding = 20;
    const tooltipWidth = 400;

    switch (step.position) {
      case "bottom":
        return {
          top: targetPosition.top + targetPosition.height + padding,
          left: Math.max(padding, Math.min(
            targetPosition.left + targetPosition.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - padding
          ))
        };
      case "top":
        return {
          bottom: window.innerHeight - targetPosition.top + padding,
          left: Math.max(padding, Math.min(
            targetPosition.left + targetPosition.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - padding
          ))
        };
      default:
        return {};
    }
  };

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[9998]"
            onClick={() => handleAction("skip")}
          />
        )}
      </AnimatePresence>

      {/* Highlight */}
      <AnimatePresence>
        {isActive && step.highlight && targetPosition && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[9999] pointer-events-none"
            style={{
              top: targetPosition.top - 8,
              left: targetPosition.left - 8,
              width: targetPosition.width + 16,
              height: targetPosition.height + 16,
              border: "3px solid #8B5CF6",
              borderRadius: "12px",
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 30px rgba(139, 92, 246, 0.5)"
            }}
          />
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed z-[10000]"
            style={
              step.position === "center"
                ? {
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)"
                  }
                : getTooltipPosition()
            }
          >
            <Card className="w-[400px] max-w-[90vw] bg-white shadow-2xl border-2 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center">
                      <StepIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{step.title}</h3>
                      <p className="text-xs text-gray-500">
                        Step {currentStep + 1} of {tourSteps.length}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleAction("skip")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <p className="text-gray-700 mb-6">{step.description}</p>

                {/* Progress dots */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  {tourSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index === currentStep
                          ? "w-8 bg-gradient-to-r from-purple-500 to-teal-500"
                          : index < currentStep
                          ? "w-2 bg-green-400"
                          : "w-2 bg-gray-300"
                      }`}
                    />
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-3">
                  {step.actions.map((action, index) => (
                    <Button
                      key={index}
                      variant={action.variant}
                      onClick={() => handleAction(action.action)}
                      className={`flex-1 ${
                        action.highlighted
                          ? "bg-gradient-to-r from-purple-500 to-teal-500 text-white hover:from-purple-600 hover:to-teal-600"
                          : ""
                      }`}
                    >
                      {action.action === "back" && <ArrowLeft className="w-4 h-4 mr-2" />}
                      {action.label}
                      {action.action === "next" && <ArrowRight className="w-4 h-4 ml-2" />}
                      {action.action === "complete" && <CheckCircle className="w-4 h-4 ml-2" />}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}