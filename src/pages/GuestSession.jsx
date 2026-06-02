import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Sparkles, Play, Pause, RotateCcw, CheckCircle2, ArrowRight, Zap, Clock, Brain, Eye } from "lucide-react";
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
  const [sessionInsight, setSessionInsight] = useState(null);
  const sessionStartTime = useRef(new Date());

  // ── AI breakdown ──────────────────────────────────────────────────────────
  const fetchBreakdown = async () => {
    setLoading(true);
    try {
      const energyLabel = ENERGY_OPTIONS.find(e => e.value === energy)?.label || energy;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Break down this SPECIFIC task into 4-6 concrete micro-steps that are UNIQUE to exactly this task and nothing else.

Task: "${taskText}"
Energy level: ${energyLabel}
Time available: ${timeMinutes} minutes

CRITICAL RULES:
- Every step must be SPECIFIC to "${taskText}" — if someone read just the steps with no context, they would know exactly what task was being broken down
- NEVER use generic steps like "do the first obvious action" or "keep going" — these could apply to any task
- Steps must name specific physical actions or objects relevant to THIS task
- Start every step with a strong action verb
- Match energy level: low energy = smaller, gentler steps; high energy = bolder steps
- All steps combined must fit within ${timeMinutes} minutes (each step 2-8 min)
- The "tip" field should be a one-line coaching nudge specific to that step

Return a JSON object with steps array and a short encouragement string.`,
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

  const generateSessionInsight = async (completedCount, totalCount, energyVal, mins) => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    const energyLabel = ENERGY_OPTIONS.find(e => e.value === energyVal)?.label?.toLowerCase() || energyVal;
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Write ONE short insight (2 sentences max) that makes this person feel genuinely seen using their specific data.

Facts:
- Task: "${taskText}"
- Completed ${completedCount} of ${totalCount} steps
- Energy when they started: ${energyLabel}
- Time committed: ${mins} minutes
- Time of day: ${timeOfDay}

Rules:
- Lead with their SPECIFIC numbers and energy level in a way that creates comparison ("Most people stop at X on ${energyLabel} energy. You didn't.")
- Use contrast to make them feel their result means something — compare their output to a realistic average
- NEVER say "great job", "well done", "amazing", or anything generic
- Do NOT compliment them — observe them. Sound like data, not a cheerleader.
- End with one forward-looking sentence that implies a pattern forming, not a one-off win
- Under 45 words total`,
      });
      setSessionInsight(typeof result === "string" ? result : result?.insight || result?.text || null);
    } catch {
      // Specific fallback based on actual data
      if (energyVal === "low" && completedCount >= totalCount * 0.6) {
        setSessionInsight(`${completedCount} of ${totalCount} steps on low energy. Most people bail at step 1 when they're running on fumes. That gap between how you felt and what you actually did — that's your real baseline.`);
      } else if (completedCount === totalCount) {
        setSessionInsight(`${completedCount} of ${totalCount} steps done. Most people leave at least one. You finished the set — that's not nothing, especially on a ${energyLabel} day.`);
      } else {
        setSessionInsight(`${completedCount} of ${totalCount} steps in ${mins} minutes on ${energyLabel} energy. That's a real data point — not a fluke, not a perfect day. Just what you're capable of on an ordinary one.`);
      }
    }
  };

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
              <div className="flex flex-col gap-3">
                {TIME_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleTimeSelect(opt.value)}
                    className="flex items-center justify-between px-6 py-4 rounded-2xl border-2 border-purple-200 bg-white hover:border-purple-500 hover:bg-purple-50 transition-all hover:scale-[1.01]"
                  >
                    <span className="text-2xl font-bold text-purple-700">{opt.label}</span>
                    <span className="text-sm text-gray-500">{opt.sub}</span>
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
            <motion.div key="focus" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">You're doing it 🎯</h2>
                <p className="text-gray-500 text-sm">Check off each step as you complete it.</p>
              </div>

              {/* Timer */}
              <MiniTimer minutes={timeMinutes} onComplete={() => {
                generateSessionInsight(completedSteps.length, steps.length, energy, timeMinutes);
                setStep(STEP_DONE);
              }} />

              {/* Steps checklist during focus */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Your steps</p>
                {steps.map((s, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => toggleStep(i)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      completedSteps.includes(i)
                        ? "border-green-300 bg-green-50"
                        : i === completedSteps.length
                          ? "border-purple-400 bg-purple-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-purple-200"
                    }`}
                  >
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      completedSteps.includes(i) ? "border-green-500 bg-green-500" : "border-gray-300"
                    }`}>
                      {completedSteps.includes(i) && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${completedSteps.includes(i) ? "line-through text-gray-400" : "text-gray-800"}`}>
                        {s.title}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{s.duration_minutes}m
                    </span>
                  </motion.button>
                ))}
              </div>

              <button
                onClick={() => {
                  generateSessionInsight(completedSteps.length, steps.length, energy, timeMinutes);
                  setStep(STEP_DONE);
                }}
                className="w-full text-center text-sm text-gray-400 hover:text-purple-600 transition-colors py-1"
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
            >
              {/* Completion header */}
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
                  className="text-6xl mb-3"
                >
                  🎯
                </motion.div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-1">That's your first session.</h2>
                <p className="text-gray-500">
                  {completedSteps.length} of {steps.length} steps done ·{" "}
                  {ENERGY_OPTIONS.find(e => e.value === energy)?.label?.toLowerCase()} energy ·{" "}
                  {timeMinutes} min
                </p>
              </div>

              {/* Personalised insight — the "we see you" moment */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white border-2 border-purple-100 rounded-2xl p-5 mb-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">What this session tells us</span>
                </div>
                {sessionInsight ? (
                  <p className="text-gray-700 text-sm leading-relaxed">{sessionInsight}</p>
                ) : (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-purple-500 flex-shrink-0" />
                    Analysing your session...
                  </div>
                )}
              </motion.div>

              {/* Loss-aversion signup card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-gradient-to-br from-purple-600 to-teal-500 rounded-3xl p-6 text-white text-left shadow-xl mb-4"
              >
                <p className="font-bold text-lg mb-2 leading-snug">
                  That's your first mood shift tracked. Don't lose it.
                </p>
                <p className="text-purple-100 text-sm mb-5 leading-relaxed">
                  Imagine what this looks like after 30 sessions — your peak hours, your patterns,
                  what kind of day you actually perform best on. That data starts now.
                  Close this tab and it's gone.
                </p>
                <button
                  onClick={() => {
                    try {
                      sessionStorage.setItem("guest_session", JSON.stringify({
                        task: taskText,
                        energy,
                        timeMinutes,
                        steps,
                        completedSteps,
                        insight: sessionInsight,
                      }));
                    } catch {}
                    base44.auth.redirectToLogin("/GuestWelcome");
                  }}
                  className="w-full bg-white text-purple-700 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Save this session — it's free
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>

              <button
                onClick={() => navigate("/")}
                className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
              >
                Not now — I'll start fresh next time
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}