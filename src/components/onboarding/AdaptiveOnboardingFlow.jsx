import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ChevronLeft, Sparkles, CheckCircle, Calendar, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AIOnboardingAssistant from "./AIOnboardingAssistant";

const GOAL_OPTIONS = [
  { id: "productivity", label: "Boost my productivity", emoji: "⚡" },
  { id: "organization", label: "Get more organized", emoji: "🗂️" },
  { id: "focus", label: "Improve my focus", emoji: "🎯" },
  { id: "habits", label: "Build better habits", emoji: "🌱" },
  { id: "stress", label: "Reduce stress and overwhelm", emoji: "🧘" },
  { id: "goals", label: "Achieve my goals", emoji: "🏆" }
];

const CHALLENGE_OPTIONS = [
  { id: "starting", label: "Starting tasks", emoji: "🚀" },
  { id: "finishing", label: "Finishing what I start", emoji: "🏁" },
  { id: "overwhelm", label: "Feeling overwhelmed", emoji: "😰" },
  { id: "distraction", label: "Getting distracted", emoji: "📱" },
  { id: "motivation", label: "Staying motivated", emoji: "💪" },
  { id: "planning", label: "Planning and organizing", emoji: "📅" }
];

const WORK_STYLE_OPTIONS = [
  { id: "burst", label: "Short intense bursts", emoji: "⚡" },
  { id: "steady", label: "Steady and consistent", emoji: "🐢" },
  { id: "deadline", label: "Deadline-driven", emoji: "⏰" },
  { id: "flexible", label: "Flexible and adaptive", emoji: "🔄" }
];

export default function AdaptiveOnboardingFlow({ 
  currentUser, 
  onComplete 
}) {
  const [step, setStep] = useState(1);
  const [responses, setResponses] = useState({});
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  const totalSteps = 6;
  const progress = (step / totalSteps) * 100;
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [calendarSynced, setCalendarSynced] = useState(null); // null | "google" | "outlook" | "skipped"

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const updateResponse = (key, value) => {
    setResponses(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key, value) => {
    setResponses(prev => {
      const current = prev[key] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  const completeOnboarding = async () => {
    setIsCreatingProfile(true);
    try {
      // Create starter tasks if AI suggested them
      if (aiSuggestions?.starter_tasks?.length > 0) {
        const tasksToCreate = aiSuggestions.starter_tasks.slice(0, 3).map(task => ({
          title: task.title,
          category: task.category || "personal",
          difficulty: task.difficulty || "easy",
          status: "not_started",
          description: "Starter task from onboarding",
          subtasks: []
        }));

        await Promise.all(
          tasksToCreate.map(task => base44.entities.Task.create(task))
        );
      }

      // Create suggested goals
      if (aiSuggestions?.suggested_goals?.length > 0) {
        const goalsToCreate = aiSuggestions.suggested_goals.slice(0, 2).map(goal => ({
          title: goal.title,
          description: goal.description,
          type: goal.type || "personal",
          status: "not_started",
          priority: "medium"
        }));

        await Promise.all(
          goalsToCreate.map(goal => base44.entities.Goal.create(goal))
        );
      }

      // Update user profile with onboarding data
      await base44.auth.updateMe({
        display_name: responses.displayName,
        onboarding_completed: true,
        onboarding_data: {
          goals: responses.primaryGoals,
          challenges: responses.mainChallenge,
          work_style: responses.workStyle,
          onboarding_date: new Date().toISOString()
        }
      });

      onComplete(aiSuggestions);
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
    setIsCreatingProfile(false);
  };

  const syncCalendar = async (provider) => {
    setIsSyncingCalendar(true);
    const fnName = provider === "google" ? "fetchCalendarEvents" : "fetchOutlookCalendarEvents";
    try {
      const res = await base44.functions.invoke(fnName, {});
      if (res.data?.success) {
        setCalendarSynced(provider);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return responses.displayName?.trim().length > 0;
      case 2: return responses.primaryGoals?.length > 0;
      case 3: return responses.mainChallenge;
      case 4: return responses.workStyle;
      case 5: return true; // calendar step is optional
      case 6: return true;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-teal-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Progress Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent mb-2">
            Welcome to TaskBuddy! 🎉
          </h1>
          <p className="text-gray-600 mb-4">
            Let's personalize your experience
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </motion.div>

        {/* AI Assistant */}
        {step >= 3 && (
          <AIOnboardingAssistant
            userResponses={responses}
            currentStep={step}
            onSuggestions={setAiSuggestions}
          />
        )}

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-purple-100 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {step === 1 && "👋 What should we call you?"}
                  {step === 2 && "🎯 What are your main goals?"}
                  {step === 3 && "💭 What's your biggest challenge?"}
                  {step === 4 && "⚡ How do you prefer to work?"}
                  {step === 5 && "✨ Your Personalized Setup"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Name */}
                {step === 1 && (
                  <div className="space-y-4">
                    <Label htmlFor="displayName">Your name or nickname</Label>
                    <Input
                      id="displayName"
                      placeholder="What should we call you?"
                      value={responses.displayName || ""}
                      onChange={(e) => updateResponse("displayName", e.target.value)}
                      className="text-lg"
                      autoFocus
                    />
                    <p className="text-sm text-gray-600">
                      This helps us personalize your experience and make it feel more friendly!
                    </p>
                  </div>
                )}

                {/* Step 2: Goals */}
                {step === 2 && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">Select all that apply:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {GOAL_OPTIONS.map(option => (
                        <div
                          key={option.id}
                          onClick={() => toggleArrayItem("primaryGoals", option.id)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            responses.primaryGoals?.includes(option.id)
                              ? "border-purple-500 bg-purple-50"
                              : "border-gray-200 hover:border-purple-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{option.emoji}</span>
                            <span className="font-medium text-gray-900">{option.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Challenge */}
                {step === 3 && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">Choose one that resonates most:</p>
                    <div className="space-y-2">
                      {CHALLENGE_OPTIONS.map(option => (
                        <div
                          key={option.id}
                          onClick={() => updateResponse("mainChallenge", option.id)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            responses.mainChallenge === option.id
                              ? "border-teal-500 bg-teal-50"
                              : "border-gray-200 hover:border-teal-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{option.emoji}</span>
                            <span className="font-medium text-gray-900">{option.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 4: Work Style */}
                {step === 4 && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">How do you work best?</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {WORK_STYLE_OPTIONS.map(option => (
                        <div
                          key={option.id}
                          onClick={() => updateResponse("workStyle", option.id)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            responses.workStyle === option.id
                              ? "border-purple-500 bg-purple-50"
                              : "border-gray-200 hover:border-purple-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{option.emoji}</span>
                            <span className="font-medium text-gray-900">{option.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 5: Summary */}
                {step === 5 && aiSuggestions && (
                  <div className="space-y-4">
                    {/* Recommended Companion */}
                    {aiSuggestions.companion_recommendation && (
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                        <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                          🤖 Recommended Companion
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          <strong>{aiSuggestions.companion_recommendation.type === "cat" ? "🐱 Cozy Cat" :
                                   aiSuggestions.companion_recommendation.type === "dog" ? "🐶 Playful Dog" :
                                   aiSuggestions.companion_recommendation.type === "orb" ? "🔮 Magic Orb" :
                                   "🤖 Friendly Robot"}</strong>
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {aiSuggestions.companion_recommendation.reason}
                        </p>
                      </div>
                    )}

                    {/* First Steps */}
                    {aiSuggestions.first_steps?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Your First Steps:</h4>
                        <div className="space-y-2">
                          {aiSuggestions.first_steps.map((step, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-100 dark:border-purple-700">
                              <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{step.action}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{step.why}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* What We're Setting Up */}
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-700">
                      <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        What we're setting up for you:
                      </h4>
                      <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
                        {aiSuggestions.starter_tasks?.length > 0 && (
                          <li>✓ {aiSuggestions.starter_tasks.length} starter tasks to get you going</li>
                        )}
                        {aiSuggestions.suggested_goals?.length > 0 && (
                          <li>✓ {aiSuggestions.suggested_goals.length} personalized goals</li>
                        )}
                        <li>✓ Your recommended companion</li>
                        <li>✓ Customized dashboard based on your preferences</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between gap-4">
          <Button
            onClick={handleBack}
            variant="outline"
            disabled={step === 1}
            className="w-32"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isCreatingProfile}
            className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold"
          >
            {isCreatingProfile ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                Creating your experience...
              </>
            ) : step === totalSteps ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Let's Go!
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}