import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Play, Pause, RotateCcw, X, Volume2, VolumeX, Volume1,
  CheckCircle2, Clock, ChevronDown, Maximize2, Minimize2,
  BellOff, Music, Zap
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const SOUND_URLS = {
  rain: "https://cdn.freesound.org/previews/531/531947_5765212-lq.mp3",
  cafe: "https://cdn.freesound.org/previews/459/459977_5765212-lq.mp3",
  forest: "https://cdn.freesound.org/previews/587/587560_7037-lq.mp3",
  ocean: "https://cdn.freesound.org/previews/527/527604_2524422-lq.mp3",
  white_noise: "https://cdn.freesound.org/previews/133/133099_2337290-lq.mp3",
  brown_noise: "https://cdn.freesound.org/previews/560/560615_7648543-lq.mp3",
};

const SOUNDS = [
  { key: "none", emoji: "🔇", name: "None" },
  { key: "rain", emoji: "🌧️", name: "Rain" },
  { key: "cafe", emoji: "☕", name: "Café" },
  { key: "forest", emoji: "🌲", name: "Forest" },
  { key: "ocean", emoji: "🌊", name: "Ocean" },
  { key: "white_noise", emoji: "📻", name: "White Noise" },
  { key: "brown_noise", emoji: "🎵", name: "Brown Noise" },
];

const THEMES = [
  { key: "midnight", label: "Midnight", bg: "from-gray-950 via-slate-900 to-gray-900", accent: "text-purple-400", ring: "ring-purple-500" },
  { key: "forest", label: "Forest", bg: "from-green-950 via-emerald-900 to-teal-950", accent: "text-emerald-400", ring: "ring-emerald-500" },
  { key: "ocean", label: "Ocean", bg: "from-blue-950 via-cyan-900 to-blue-950", accent: "text-cyan-400", ring: "ring-cyan-500" },
  { key: "sunset", label: "Sunset", bg: "from-orange-950 via-rose-900 to-purple-950", accent: "text-rose-400", ring: "ring-rose-500" },
];

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function FocusMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedId = urlParams.get("taskId");

  const [currentUser, setCurrentUser] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(preselectedId || "");
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [completedSubtasks, setCompletedSubtasks] = useState(new Set());
  const [sound, setSound] = useState("none");
  const [volume, setVolume] = useState(50);
  const [theme, setTheme] = useState("midnight");
  const [showControls, setShowControls] = useState(true);
  const [showSoundPanel, setShowSoundPanel] = useState(false);
  const [notificationsBlocked, setNotificationsBlocked] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [breathPhase, setBreathPhase] = useState("inhale"); // breathing animation

  const audioRef = useRef(null);
  const hideControlsTimer = useRef(null);
  const breathTimer = useRef(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ["focusModeTasks", currentUser?.id],
    queryFn: () => base44.entities.Task.filter({ status: "not_started" }),
    enabled: !!currentUser,
  });

  const { data: inProgressTasks = [] } = useQuery({
    queryKey: ["focusModeInProgress", currentUser?.id],
    queryFn: () => base44.entities.Task.filter({ status: "in_progress" }),
    enabled: !!currentUser,
  });

  const allActiveTasks = [...inProgressTasks, ...tasks].filter(t => t.subtasks?.length > 0);
  const selectedTask = allActiveTasks.find(t => t.id === selectedTaskId) || allActiveTasks[0];
  const currentTheme = THEMES.find(t => t.key === theme) || THEMES[0];

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Auto-select first task
  useEffect(() => {
    if (!selectedTaskId && allActiveTasks.length > 0) {
      setSelectedTaskId(allActiveTasks[0].id);
    }
  }, [allActiveTasks.length]);

  // Timer
  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Sound
  useEffect(() => {
    if (!audioRef.current) return;
    if (sound !== "none" && SOUND_URLS[sound]) {
      audioRef.current.src = SOUND_URLS[sound];
      audioRef.current.loop = true;
      audioRef.current.volume = volume / 100;
      if (isRunning) audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [sound]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isRunning && sound !== "none") {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isRunning]);

  // Breathing animation cycle
  useEffect(() => {
    if (!isRunning) return;
    const cycle = () => {
      setBreathPhase("inhale");
      breathTimer.current = setTimeout(() => {
        setBreathPhase("hold");
        breathTimer.current = setTimeout(() => {
          setBreathPhase("exhale");
          breathTimer.current = setTimeout(cycle, 6000);
        }, 2000);
      }, 4000);
    };
    cycle();
    return () => clearTimeout(breathTimer.current);
  }, [isRunning]);

  // Auto-hide controls
  useEffect(() => {
    if (!sessionStarted) return;
    const reset = () => {
      setShowControls(true);
      clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = setTimeout(() => setShowControls(false), 4000);
    };
    window.addEventListener("mousemove", reset);
    window.addEventListener("touchstart", reset);
    reset();
    return () => {
      window.removeEventListener("mousemove", reset);
      window.removeEventListener("touchstart", reset);
      clearTimeout(hideControlsTimer.current);
    };
  }, [sessionStarted]);

  // Notification blocking via document title trick + visibility
  useEffect(() => {
    if (!sessionStarted || !notificationsBlocked) return;
    const original = document.title;
    document.title = "🔴 Focus Mode - Do Not Disturb";
    return () => { document.title = original; };
  }, [sessionStarted, notificationsBlocked]);

  const handleStart = () => {
    if (!selectedTask) return;
    setSessionStarted(true);
    setIsRunning(true);
    toast.success("Focus Mode started – notifications silenced 🔕");
  };

  const handleToggle = () => setIsRunning(r => !r);

  const handleReset = () => {
    setIsRunning(false);
    setElapsed(0);
    setCompletedSubtasks(new Set());
  };

  const handleExit = async () => {
    setIsRunning(false);
    if (audioRef.current) audioRef.current.pause();

    // Save completed subtasks
    if (selectedTask && completedSubtasks.size > 0) {
      const updatedSubtasks = selectedTask.subtasks.map((st, i) => ({
        ...st,
        completed: completedSubtasks.has(i) || st.completed,
      }));
      const allDone = updatedSubtasks.every(st => st.completed);
      await base44.entities.Task.update(selectedTask.id, {
        subtasks: updatedSubtasks,
        status: allDone ? "completed" : "in_progress",
      });
    }

    window.location.href = createPageUrl("Tasks");
  };

  const toggleSubtask = (index) => {
    setCompletedSubtasks(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const completedCount = selectedTask
    ? selectedTask.subtasks.filter((st, i) => completedSubtasks.has(i) || st.completed).length
    : 0;
  const totalCount = selectedTask?.subtasks?.length || 0;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const breathLabel = breathPhase === "inhale" ? "Breathe In..." : breathPhase === "hold" ? "Hold..." : "Breathe Out...";
  const breathScale = breathPhase === "inhale" ? 1.25 : breathPhase === "hold" ? 1.25 : 1;

  return (
    <div className={`fixed inset-0 z-50 bg-gradient-to-br ${currentTheme.bg} flex flex-col overflow-hidden select-none`}>
      <audio ref={audioRef} loop />

      {/* ── TOP BAR ── */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/40 to-transparent"
          >
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 ${currentTheme.accent}`}>
                <Zap className="w-5 h-5" />
                <span className="font-bold text-lg tracking-wide text-white">Focus Mode</span>
              </div>
              {notificationsBlocked && (
                <div className="flex items-center gap-1 bg-white/10 backdrop-blur rounded-full px-3 py-1">
                  <BellOff className="w-3.5 h-3.5 text-white/80" />
                  <span className="text-xs text-white/80">DND On</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Theme selector */}
              <div className="flex gap-1">
                {THEMES.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTheme(t.key)}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${theme === t.key ? "border-white scale-125" : "border-white/30"} bg-gradient-to-br ${t.bg}`}
                  />
                ))}
              </div>
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-red-400 hover:bg-white/10" onClick={handleExit}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ── */}
      {!sessionStarted ? (
        // Setup Screen
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-6"
          >
            <div className="text-center">
              <div className={`text-5xl mb-3`}>🎯</div>
              <h2 className="text-2xl font-bold text-white">Enter Focus Mode</h2>
              <p className="text-white/50 text-sm mt-1">Distractions off. Work on.</p>
            </div>

            {/* Task picker */}
            <div className="space-y-2">
              <label className="text-white/70 text-sm font-medium">Select Task</label>
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Choose a task..." />
                </SelectTrigger>
                <SelectContent>
                  {allActiveTasks.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.status === "in_progress" ? "▶ " : ""}{t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sound picker */}
            <div className="space-y-2">
              <label className="text-white/70 text-sm font-medium flex items-center gap-2">
                <Music className="w-4 h-4" /> Ambient Sound
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SOUNDS.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setSound(s.key)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all text-xs ${
                      sound === s.key
                        ? `border-white/60 bg-white/20 text-white`
                        : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"
                    }`}
                  >
                    <span className="text-lg">{s.emoji}</span>
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
              {sound !== "none" && (
                <div className="flex items-center gap-3 mt-2">
                  <Volume1 className="w-4 h-4 text-white/50" />
                  <Slider value={[volume]} onValueChange={v => setVolume(v[0])} max={100} step={5} className="flex-1" />
                  <Volume2 className="w-4 h-4 text-white/50" />
                </div>
              )}
            </div>

            <Button
              onClick={handleStart}
              disabled={!selectedTask}
              className={`w-full py-6 text-lg font-bold rounded-2xl bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white shadow-xl border-0`}
            >
              <Zap className="w-5 h-5 mr-2" />
              Start Focus Session
            </Button>
          </motion.div>
        </div>
      ) : (
        // Active Focus Screen
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 relative">

          {/* Breathing orb */}
          <motion.div
            animate={{ scale: breathScale }}
            transition={{ duration: breathPhase === "inhale" ? 4 : breathPhase === "hold" ? 0.1 : 6, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className={`w-96 h-96 rounded-full opacity-10 bg-gradient-to-br ${currentTheme.bg.replace("from-", "from-").replace("via-", "via-").replace("to-", "to-")} blur-3xl`}
              style={{ background: "radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)" }}
            />
          </motion.div>

          {/* Task title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center z-10 max-w-xl"
          >
            <p className={`text-sm font-medium uppercase tracking-widest mb-2 ${currentTheme.accent} opacity-70`}>Working on</p>
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">{selectedTask?.title}</h1>
            {isRunning && (
              <motion.p
                key={breathPhase}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                className="text-white/50 text-sm mt-3"
              >
                {breathLabel}
              </motion.p>
            )}
          </motion.div>

          {/* Timer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`text-7xl md:text-8xl font-mono font-bold text-white z-10 tabular-nums`}
          >
            {formatTime(elapsed)}
          </motion.div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="w-full max-w-sm z-10 space-y-1">
              <div className="flex justify-between text-xs text-white/50">
                <span>{completedCount} / {totalCount} steps done</span>
                <span>{Math.round(progressPct)}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r from-purple-400 to-teal-400`}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}

          {/* Subtask list */}
          {selectedTask?.subtasks?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm z-10 bg-white/5 backdrop-blur rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden"
            >
              {selectedTask.subtasks.map((st, i) => {
                const done = completedSubtasks.has(i) || st.completed;
                return (
                  <button
                    key={i}
                    onClick={() => toggleSubtask(i)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${done ? "bg-purple-500 border-purple-500" : "border-white/30"}`}>
                      {done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className={`text-sm flex-1 transition-all ${done ? "line-through text-white/30" : "text-white/80"}`}>
                      {st.title}
                    </span>
                    {st.estimated_minutes && (
                      <span className="text-white/30 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />{st.estimated_minutes}m
                      </span>
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}

          {/* Controls */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="flex items-center gap-3 z-10"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
                  onClick={handleReset}
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>

                <Button
                  size="lg"
                  onClick={handleToggle}
                  className="w-20 h-20 rounded-full bg-white text-gray-900 hover:bg-white/90 shadow-2xl font-bold border-0"
                >
                  {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                </Button>

                {/* Sound mini toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
                  onClick={() => setShowSoundPanel(p => !p)}
                >
                  {sound === "none" ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sound quick panel */}
          <AnimatePresence>
            {showSoundPanel && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-28 right-6 z-30 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4 w-64 space-y-3"
              >
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">Ambient Sound</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {SOUNDS.map(s => (
                    <button
                      key={s.key}
                      onClick={() => { setSound(s.key); }}
                      className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-xs transition-all ${sound === s.key ? "bg-white/20 text-white" : "text-white/40 hover:text-white/70"}`}
                    >
                      <span className="text-base">{s.emoji}</span>
                      <span className="truncate w-full text-center">{s.name}</span>
                    </button>
                  ))}
                </div>
                {sound !== "none" && (
                  <div className="flex items-center gap-2">
                    <VolumeX className="w-3.5 h-3.5 text-white/40" />
                    <Slider value={[volume]} onValueChange={v => setVolume(v[0])} max={100} step={5} className="flex-1" />
                    <Volume2 className="w-3.5 h-3.5 text-white/40" />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── BOTTOM EXIT (active session) ── */}
      <AnimatePresence>
        {sessionStarted && showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 flex justify-center pb-6 bg-gradient-to-t from-black/40 to-transparent pt-10"
          >
            <Button
              variant="ghost"
              onClick={handleExit}
              className="text-white/40 hover:text-white/80 text-sm"
            >
              <X className="w-4 h-4 mr-1.5" />
              End Session & Save Progress
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}