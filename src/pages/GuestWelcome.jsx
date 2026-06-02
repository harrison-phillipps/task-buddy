import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Sparkles, Brain, Zap, Clock, ArrowRight, TrendingUp } from "lucide-react";

// Reads guest session data stored in sessionStorage before login redirect
function getGuestData() {
  try {
    const raw = sessionStorage.getItem("guest_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function InsightCard({ emoji, label, value, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex items-center gap-4 bg-white rounded-2xl border border-purple-100 shadow-sm px-4 py-3"
    >
      <span className="text-2xl">{emoji}</span>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="font-semibold text-gray-800 text-sm">{value}</p>
      </div>
    </motion.div>
  );
}

export default function GuestWelcome() {
  const navigate = useNavigate();
  const [guestData, setGuestData] = useState(null);
  const [aiInsight, setAiInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const data = getGuestData();
    setGuestData(data);

    base44.auth.me().then(user => {
      const name = user?.full_name?.split(" ")[0] || user?.display_name || "";
      setUserName(name);
    }).catch(() => {});

    if (data) {
      generateInsight(data);
    }
  }, []);

  const generateInsight = async (data) => {
    setLoadingInsight(true);
    try {
      const stepsCompleted = data.completedSteps?.length || 0;
      const totalSteps = data.steps?.length || 0;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `A new user just completed their very first productivity session. Generate a short, warm, personalized insight (2-3 sentences) about what this session reveals about them. 
        
Details:
- Task they tackled: "${data.task}"
- Energy level when they started: ${data.energy}
- Time they committed: ${data.timeMinutes} minutes
- Steps completed: ${stepsCompleted} out of ${totalSteps}

Tone: warm, insightful, like a coach who already knows them. Don't be generic. Reference their actual task and choices. End with one forward-looking sentence about their pattern.`,
      });
      setAiInsight(result);
    } catch {
      setAiInsight(`You chose to start "${data?.task}" even on ${data?.energy} energy — that's a meaningful signal. Most people wait for the perfect moment; you just went for it. That's the pattern we're going to build on.`);
    }
    setLoadingInsight(false);
  };

  const handleContinue = () => {
    // Clear guest data — it's been shown
    sessionStorage.removeItem("guest_session");
    navigate(createPageUrl("Onboarding"));
  };

  const energyLabel = {
    low: "running on fumes",
    medium: "feeling okay",
    high: "full energy",
  }[guestData?.energy] || guestData?.energy;

  const completionRate = guestData
    ? Math.round(((guestData.completedSteps?.length || 0) / Math.max(guestData.steps?.length || 1, 1)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-teal-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ff06728f59128717455ed3/947e987fc_Screenshot2025-12-08at84335AM.png"
            alt="TaskBuddy"
            className="w-8 h-8 rounded-xl object-cover"
          />
          <span className="font-bold text-gray-700">TaskBuddy</span>
        </div>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-4xl mb-3">🎉</div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            {userName ? `Welcome, ${userName}.` : "Welcome aboard."}
          </h1>
          <p className="text-gray-500 text-lg mb-8">
            Your first session is saved. Here's what we already know about you.
          </p>
        </motion.div>

        {/* Session data cards */}
        {guestData && (
          <div className="space-y-3 mb-6">
            <InsightCard emoji="🎯" label="First task tackled" value={`"${guestData.task}"`} delay={0.1} />
            <InsightCard emoji="⚡" label="Energy when you started" value={energyLabel} delay={0.15} />
            <InsightCard emoji="⏱️" label="Time you committed" value={`${guestData.timeMinutes} minutes`} delay={0.2} />
            <InsightCard
              emoji={completionRate >= 80 ? "🔥" : completionRate >= 50 ? "💪" : "🌱"}
              label="Steps completed"
              value={`${guestData.completedSteps?.length || 0} of ${guestData.steps?.length || 0} (${completionRate}%)`}
              delay={0.25}
            />
          </div>
        )}

        {/* AI insight */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-gradient-to-br from-purple-600 to-teal-500 rounded-3xl p-5 text-white mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4" />
            <span className="text-sm font-semibold uppercase tracking-wide opacity-80">What this tells us</span>
          </div>
          {loadingInsight ? (
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white"
              />
              <span className="text-sm opacity-80">Analysing your session...</span>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-purple-50">{aiInsight}</p>
          )}
        </motion.div>

        {/* Pattern preview */}
        {guestData && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-white border border-purple-100 rounded-2xl p-4 mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold text-gray-700">Your pattern — session 1 of many</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                  className="h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-teal-500"
                />
              </div>
              <span className="text-sm font-bold text-purple-600">{completionRate}%</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Each session builds your productivity profile. By session 5, we'll know your peak hours, your best task type, and what kind of nudge gets you moving.
            </p>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
          <button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-purple-600 to-teal-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg"
          >
            <Sparkles className="w-5 h-5" />
            Set up my companion
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-center text-xs text-gray-400 mt-3">Takes 30 seconds. No forms. Just one choice.</p>
        </motion.div>

      </div>
    </div>
  );
}