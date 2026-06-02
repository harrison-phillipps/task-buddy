import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Sparkles, Play, Pause, RotateCcw, CheckCircle2, ArrowRight, Zap, Clock, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Step constants ───────────────────────────────────────────────────────────
const STEP_ENERGY = "energy";
const STEP_TIME = "time";
const STEP_BREAKDOWN = "breakdown";
const STEP_FOCUS = "focus";
const STEP_DONE = "done";

const ENERGY_OPTIONS = [
  { value: "low", label: "Running on fumes", emoji: "😴", color: "border-blue-200 bg-blue-50 text-blue-700" },
  { value: "medium", label: "Feeling okay", emoji: "😐", color: "border-yellow-200 bg-yellow-50 text-yellow-700" },
  { value: "high", label: "Ready to go!", emoji: "⚡", color: "border-green-200 bg-green-50 text-green-700" },
];

const TIME_OPTIONS = [
  { value: 10, label: "10 min", sub: "Quick sprint" },
  { value: 20, label: "20 min", sub: "Good chunk" },
  { value: 30, label: "30 min", sub: "Deep dive" },
  { value: 45, label: "45 min", sub: "Full focus" },
];

// ─── Mini timer ───────────────────────────────────────────────────────────────
function MiniTimer({ minutes, onComplete }) {
  const total = minutes * 60;
  const [timeLeft, setTimeLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = ((total - timeLeft) / total) * 100;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={radius} fill="none" strokeWidth="8" className="stroke-gray-100" />
          <circle
            cx="80" cy="80" r={radius} fill="none" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="stroke-purple-500 transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums text-gray-900">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
          <span className="text-xs text-gray-400 mt-1">remaining</span>
        </div>
      </div>
      <div className="flex gap-3">
        <Button
          onClick={() => setRunning(r => !r)}
          className="bg-gradient-to-r from-purple-600 to-teal-500 text-white px-8 font-semibold"
          size="lg"
        >
          {running ? <><Pause className="w-5 h-5 mr-2" />Pause</> : <><Play className="w-5 h-5 mr-2" />Start</>}
        </Button>
        <Button variant="outline" size="lg" onClick={() => { setRunning(false); setTimeLeft(total); }}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function GuestSession() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const taskText = urlParams.get("task") || "my task";

  const [step, setStep] = useState(STEP_ENERGY);
  const [energy, setEnergy] = useState(null);
  const [timeMinutes, setTimeMinutes] = useState(null);
  const [steps, setSteps] = useState([]);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  // ── AI breakdown ──────────────────────────────────────────────────────────
  const fetchBreakdown = async () => {
    setLoading(true);
    try {
      const energyLabel = ENERGY_OPTIONS.find(e => e.value === energy)?.label || energy;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Break down this task into 4-6 small, concrete micro-steps that someone can actually do right now. 
Task: "${taskText}"
Energy level: ${energyLabel}
Time available: ${timeMinutes} minutes

Rules:
- Each step should take 2-8 minutes max
- Be very specific and action-oriented (start with a verb)
- Match the energy level — low energy = gentler steps
- Steps must fit within the total time of ${timeMinutes} minutes

Return a JSON object.`,
        response_json_schema: {
          type: "object",
          properties: {
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  duration_minutes: { type: "number" },
                  tip: { type: "string" }
                }
              }
            },
            encouragement: { type: "string" }
          }
        }
      });
      setSteps(result.steps || []);
      setStep(STEP_BREAKDOWN);
    } catch (err) {
      // Fallback steps
      setSteps([
        { title: `Start with just 2 minutes on: ${taskText}`, duration_minutes: 2, tip: "Just begin — momentum builds fast." },
        { title: "Clear the space in front of you", duration_minutes: 3, tip: "A clear space = a clear mind." },
        { title: "Do the first obvious action", duration_minutes: 5, tip: "Don't plan, just act." },
        { title: "Keep going for 5 more minutes", duration_minutes: 5, tip: "You're in the zone now." },
      ]);
      setStep(STEP_BREAKDOWN);
    }
    setLoading(false);
  };

  const handleTimeSelect = (mins) => {
    setTimeMinutes(mins);
    fetchBreakdown();
  };

  const toggleStep = (idx) => {
    setCompletedSteps(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const allStepsDone = steps.length > 0 && completedSteps.length === steps.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-teal-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Logo bar */}
        <div className="flex items-center gap-2 mb-8">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ff06728f59128717455ed3/947e987fc_Screenshot2025-12-08at84335AM.png"
            alt="TaskBuddy"
            className="w-8 h-8 rounded-xl object-cover"
          />
          <span className="font-bold text-gray-700">TaskBuddy</span>
        </div>

        {/* Task pill */}
        <div className="mb-6 inline-flex items-center gap-2 bg-white border border-purple-100 rounded-full px-4 py-2 shadow-sm">
          <Brain className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-700 truncate max-w-xs">"{taskText}"</span>
        </div>

        <AnimatePresence mode="wait">

          {/* ── STEP: Energy ─────────────────────────────────── */}
          {step === STEP_ENERGY && (
            <motion.div key="energy" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">How's your energy right now?</h2>
              <p className="text-gray-500 mb-6">We'll tailor the steps to match how you're feeling.</p>
              <div className="space-y-3">
                {ENERGY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setEnergy(opt.value); setStep(STEP_TIME); }}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all hover:scale-[1.01] ${opt.color}`}
                  >
                    <span className="text-3xl">{opt.emoji}</span>
                    <span className="font-semibold text-lg">{opt.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── STEP: Time ───────────────────────────────────── */}
          {step === STEP_TIME && (
            <motion.div key="time" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">How much time do you have?</h2>
              <p className="text-gray-500 mb-6">We'll fit your steps into this window.</p>
              <div className="grid grid-cols-2 gap-3">
                {TIME_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleTimeSelect(opt.value)}
                    className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-purple-200 bg-white hover:border-purple-500 hover:bg-purple-50 transition-all hover:scale-[1.02]"
                  >
                    <span className="text-2xl font-bold text-purple-700">{opt.label}</span>
                    <span className="text-sm text-gray-500 mt-1">{opt.sub}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Loading ──────────────────────────────────────── */}
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"
              />
              <p className="text-gray-600 font-medium">Breaking it down for you...</p>
              <p className="text-gray-400 text-sm mt-1">Powered by AI ✨</p>
            </motion.div>
          )}

          {/* ── STEP: Breakdown ──────────────────────────────── */}
          {step === STEP_BREAKDOWN && !loading && (
            <motion.div key="breakdown" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h2 className="text-2xl font-bold text-gray-900">Here's your plan</h2>
              </div>
              <p className="text-gray-500 mb-6">Check off each step as you go. You've got {timeMinutes} minutes.</p>

              <div className="space-y-3 mb-6">
                {steps.map((s, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => toggleStep(i)}
                    className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                      completedSteps.includes(i)
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200 bg-white hover:border-purple-300"
                    }`}
                  >
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all ${
                      completedSteps.includes(i) ? "border-green-500 bg-green-500" : "border-gray-300"
                    }`}>
                      {completedSteps.includes(i) && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${completedSteps.includes(i) ? "line-through text-gray-400" : "text-gray-800"}`}>
                        {s.title}
                      </p>
                      {s.tip && <p className="text-xs text-gray-400 mt-0.5">{s.tip}</p>}
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />{s.duration_minutes}m
                    </span>
                  </motion.button>
                ))}
              </div>

              <Button
                onClick={() => setStep(STEP_FOCUS)}
                className="w-full bg-gradient-to-r from-purple-600 to-teal-500 text-white font-semibold py-3"
                size="lg"
              >
                <Zap className="w-5 h-5 mr-2" />
                Start the timer
              </Button>
            </motion.div>
          )}

          {/* ── STEP: Focus timer ────────────────────────────── */}
          {step === STEP_FOCUS && (
            <motion.div key="focus" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <h2 className="text-2xl font-bold text-gray-900 mb-1 text-center">You're doing it 🎯</h2>
              <p className="text-gray-500 text-center mb-8">Focus time. Refer to your steps above when needed.</p>

              <MiniTimer minutes={timeMinutes} onComplete={() => setStep(STEP_DONE)} />

              <button
                onClick={() => setStep(STEP_DONE)}
                className="mt-6 w-full text-center text-sm text-gray-400 hover:text-purple-600 transition-colors"
              >
                I'm done early →
              </button>
            </motion.div>
          )}

          {/* ── STEP: Done / Signup nudge ─────────────────────── */}
          {step === STEP_DONE && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
                className="text-7xl mb-4"
              >
                🎉
              </motion.div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-2">You did it.</h2>
              <p className="text-gray-500 text-lg mb-2">
                You just started <span className="font-semibold text-gray-700">"{taskText}"</span>.
              </p>
              <p className="text-gray-400 text-sm mb-8">
                That momentum you feel? That's real. Keep it going.
              </p>

              {/* Signup nudge card */}
              <div className="bg-gradient-to-br from-purple-600 to-teal-500 rounded-3xl p-6 text-white text-left shadow-xl mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-bold text-lg">Want to track your progress?</span>
                </div>
                <p className="text-purple-100 text-sm mb-4 leading-relaxed">
                  Create a free account and TaskBuddy will remember your wins, spot your patterns,
                  and keep you on a streak. You've already felt what it can do.
                </p>
                <button
                  onClick={() => base44.auth.redirectToLogin("/Dashboard")}
                  className="w-full bg-white text-purple-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors"
                >
                  Save my progress — it's free
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => navigate("/")}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Not now — go back to start
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}