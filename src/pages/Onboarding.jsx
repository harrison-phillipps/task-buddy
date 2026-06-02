import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Heart, ChevronRight, ChevronLeft } from "lucide-react";
import CompanionPersonalitySelector from "../components/CompanionPersonalitySelector";
import AdaptiveOnboardingFlow from "../components/onboarding/AdaptiveOnboardingFlow";
import CalendarOnboarding from "../components/onboarding/CalendarOnboarding";

export default function Onboarding() {
  const navigate = useNavigate();
  const [useAdaptiveFlow, setUseAdaptiveFlow] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [personality, setPersonality] = useState("motivational");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCalendarStep, setShowCalendarStep] = useState(false);
  const [pendingDestination, setPendingDestination] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        // If they came from guest mode, send them to the personalized welcome first
        const hasGuestSession = !!sessionStorage.getItem("guest_session");
        if (hasGuestSession && !user.display_name) {
          navigate("/GuestWelcome");
          return;
        }

        if (user.display_name) {
          if (!user.companion_type) {
            navigate(createPageUrl("CharacterSelection"));
          } else {
            navigate(createPageUrl("Dashboard"));
          }
        }
      } catch (error) {
        console.error("Error checking user:", error);
      }
    };
    checkUser();
  }, [navigate]);

  const handleAdaptiveComplete = async (aiSuggestions) => {
    let destination = "CharacterSelection";
    if (aiSuggestions?.companion_recommendation?.type) {
      await base44.auth.updateMe({
        companion_type: aiSuggestions.companion_recommendation.type,
      });
      destination = "Dashboard";
    }
    setPendingDestination(destination);
    setShowCalendarStep(true);
  };

  const handleCalendarDone = () => {
    navigate(createPageUrl(pendingDestination ?? "Dashboard"));
  };

  if (showCalendarStep) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-teal-50 to-blue-50 dark:from-[#1a1025] dark:via-[#0f1a1f] dark:to-[#0d1220] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <CalendarOnboarding
            onComplete={handleCalendarDone}
            onSkip={handleCalendarDone}
          />
        </motion.div>
      </div>
    );
  }

  if (useAdaptiveFlow) {
    return (
      <AdaptiveOnboardingFlow
        currentUser={currentUser}
        onComplete={handleAdaptiveComplete}
      />
    );
  }

  const handleNext = () => {
    if (step === 1 && name.trim()) setStep(2);
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await base44.auth.updateMe({
        display_name: name.trim(),
        gender: gender || "neutral",
        companion_personality: personality,
      });
      navigate(createPageUrl("CharacterSelection"));
    } catch (error) {
      console.error("Error saving profile:", error);
    }
    setIsSubmitting(false);
  };

  const genderOptions = [
    { value: "female", label: "She/Her", emoji: "👩" },
    { value: "male", label: "He/Him", emoji: "👨" },
    { value: "neutral", label: "They/Them", emoji: "🧑" },
    { value: "skip", label: "Prefer not to say", emoji: "✨" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-teal-50 to-blue-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-purple-100 dark:border-gray-700 shadow-xl">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mx-auto mb-4"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
                <Heart className="w-10 h-10 text-white" />
              </div>
            </motion.div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
              Welcome to TaskBuddy! 💜
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Let's get to know you a little better</p>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700 font-medium">
                      What should I call you?
                    </Label>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="text-lg py-6"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-gray-700 font-medium">Your pronouns (optional)</Label>
                    <p className="text-xs text-gray-500">
                      This helps your companion use the right words when cheering you on!
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {genderOptions.map((option) => (
                        <Button
                          key={option.value}
                          variant={gender === option.value ? "default" : "outline"}
                          onClick={() => setGender(option.value)}
                          className={`h-auto py-3 ${
                            gender === option.value
                              ? "bg-gradient-to-r from-purple-500 to-teal-500 text-white"
                              : "hover:bg-purple-50"
                          }`}
                        >
                          <span className="mr-2 text-lg">{option.emoji}</span>
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={handleNext}
                    disabled={!name.trim()}
                    className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold py-6 text-lg shadow-lg"
                  >
                    Next <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="space-y-3">
                    <Label className="text-gray-700 font-medium">
                      How should your companion talk to you?
                    </Label>
                    <p className="text-xs text-gray-500">
                      Choose a personality style for your AI companion's messages
                    </p>
                    <CompanionPersonalitySelector
                      selected={personality}
                      onSelect={setPersonality}
                      compact
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleBack} className="flex-1 py-6">
                      <ChevronLeft className="w-5 h-5 mr-2" /> Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold py-6 text-lg shadow-lg"
                    >
                      {isSubmitting ? "Saving..." : <><Sparkles className="w-5 h-5 mr-2" />Continue</>}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-center gap-2 pt-2">
              <div className={`w-2 h-2 rounded-full transition-all ${step === 1 ? "bg-purple-500 w-6" : "bg-gray-300"}`} />
              <div className={`w-2 h-2 rounded-full transition-all ${step === 2 ? "bg-purple-500 w-6" : "bg-gray-300"}`} />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}