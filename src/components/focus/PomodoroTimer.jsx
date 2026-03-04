import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Settings, Coffee, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "Classic", work: 25, shortBreak: 5, longBreak: 15, cycles: 4 },
  { label: "Deep Work", work: 50, shortBreak: 10, longBreak: 20, cycles: 2 },
  { label: "Quick Sprint", work: 15, shortBreak: 3, longBreak: 10, cycles: 6 },
  { label: "Custom", work: null, shortBreak: null, longBreak: null, cycles: null },
];

export default function PomodoroTimer({
  isActive,
  onToggle,
  onCycleComplete,
  onSessionEnd,
  externalTimeLeft,
  externalIsBreak,
}) {
  const [workMinutes, setWorkMinutes] = useState(25);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);
  const [cyclesBeforeLong, setCyclesBeforeLong] = useState(4);
  const [selectedPreset, setSelectedPreset] = useState("Classic");
  const [showSettings, setShowSettings] = useState(false);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [phase, setPhase] = useState("work"); // work | short_break | long_break
  const [timeLeft, setTimeLeft] = useState(workMinutes * 60);
  const [internalActive, setInternalActive] = useState(false);
  const intervalRef = useRef(null);

  const totalSeconds = phase === "work"
    ? workMinutes * 60
    : phase === "short_break"
    ? shortBreakMinutes * 60
    : longBreakMinutes * 60;

  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  useEffect(() => {
    setTimeLeft(workMinutes * 60);
    setPhase("work");
    setCyclesCompleted(0);
  }, [workMinutes, shortBreakMinutes, longBreakMinutes, cyclesBeforeLong]);

  useEffect(() => {
    if (!internalActive) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setInternalActive(false);
          handlePhaseEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [internalActive, phase]);

  const handlePhaseEnd = () => {
    if (phase === "work") {
      const newCycles = cyclesCompleted + 1;
      setCyclesCompleted(newCycles);
      onCycleComplete?.(newCycles);
      if (newCycles % cyclesBeforeLong === 0) {
        setPhase("long_break");
        setTimeLeft(longBreakMinutes * 60);
      } else {
        setPhase("short_break");
        setTimeLeft(shortBreakMinutes * 60);
      }
    } else {
      setPhase("work");
      setTimeLeft(workMinutes * 60);
    }
    // Play a tick sound via AudioContext
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(phase === "work" ? 440 : 523, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {}
  };

  const toggle = () => setInternalActive(a => !a);

  const reset = () => {
    setInternalActive(false);
    setPhase("work");
    setTimeLeft(workMinutes * 60);
    setCyclesCompleted(0);
  };

  const applyPreset = (preset) => {
    setSelectedPreset(preset.label);
    if (preset.work) {
      setWorkMinutes(preset.work);
      setShortBreakMinutes(preset.shortBreak);
      setLongBreakMinutes(preset.longBreak);
      setCyclesBeforeLong(preset.cycles);
      setTimeLeft(preset.work * 60);
      setPhase("work");
      setInternalActive(false);
    }
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const phaseColors = {
    work: "from-purple-500 to-indigo-600",
    short_break: "from-teal-500 to-green-500",
    long_break: "from-blue-500 to-cyan-500",
  };
  const phaseLabel = phase === "work" ? "Focus" : phase === "short_break" ? "Short Break" : "Long Break";

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-purple-100 dark:border-gray-700 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">Pomodoro Timer</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            🍅 Cycle {cyclesCompleted + 1} · {cyclesCompleted} completed
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowSettings(s => !s)}>
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Preset pills */}
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => applyPreset(p)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-all",
              selectedPreset === p.label
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-purple-300"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Circular timer */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-48 h-48">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 196 196">
            <circle cx="98" cy="98" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-gray-100 dark:text-gray-700" />
            <circle
              cx="98" cy="98" r={radius} fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={cn("transition-all duration-1000", phase === "work" ? "stroke-purple-500" : phase === "short_break" ? "stroke-teal-500" : "stroke-blue-500")}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Badge className={cn("mb-1 text-xs bg-gradient-to-r text-white border-none", phaseColors[phase])}>
              {phase === "work" ? <Zap className="w-3 h-3 mr-1" /> : <Coffee className="w-3 h-3 mr-1" />}
              {phaseLabel}
            </Badge>
            <span className="text-4xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={toggle}
            size="lg"
            className={cn("bg-gradient-to-r text-white font-semibold px-8", phaseColors[phase])}
          >
            {internalActive ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
            {internalActive ? "Pause" : "Start"}
          </Button>
          <Button variant="outline" size="lg" onClick={reset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Phase dots */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: cyclesBeforeLong }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all",
              i < cyclesCompleted % cyclesBeforeLong || (cyclesCompleted > 0 && cyclesCompleted % cyclesBeforeLong === 0 && i < cyclesBeforeLong)
                ? "bg-purple-500" : "bg-gray-200 dark:bg-gray-600"
            )}
          />
        ))}
      </div>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              {[
                { label: `Focus: ${workMinutes} min`, value: workMinutes, setter: setWorkMinutes, min: 5, max: 90 },
                { label: `Short Break: ${shortBreakMinutes} min`, value: shortBreakMinutes, setter: setShortBreakMinutes, min: 1, max: 20 },
                { label: `Long Break: ${longBreakMinutes} min`, value: longBreakMinutes, setter: setLongBreakMinutes, min: 5, max: 40 },
                { label: `Cycles before long break: ${cyclesBeforeLong}`, value: cyclesBeforeLong, setter: setCyclesBeforeLong, min: 2, max: 8 },
              ].map(({ label, value, setter, min, max }) => (
                <div key={label} className="space-y-1.5">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
                  <Slider value={[value]} onValueChange={v => { setter(v[0]); setSelectedPreset("Custom"); }} min={min} max={max} step={1} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}