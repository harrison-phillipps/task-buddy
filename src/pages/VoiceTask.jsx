import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Mic, Square, Sparkles, Loader2, Clock, Trash2, Save,
  RefreshCcw, Repeat, ChevronDown, ChevronUp, Wand2,
  Calendar, Sun, Sunrise, Sunset, Moon, Play, ListTodo
} from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

/* ─── constants ────────────────────────────────────────────── */
const PRIORITY_STYLES = {
  must_do: "bg-red-100 text-red-700 border-red-200",
  should_do: "bg-yellow-100 text-yellow-700 border-yellow-200",
  could_do: "bg-green-100 text-green-700 border-green-200",
};
const PRIORITY_LABELS = { must_do: "🔴 Must Do", should_do: "🟡 Should Do", could_do: "🟢 Could Do" };
const CATEGORY_EMOJIS = {
  work: "💼", personal: "🏠", health: "💪", creative: "🎨",
  learning: "📚", household: "🧹", other: "📌",
};
const BLOCK_ICONS = {
  morning:   { icon: Sunrise, label: "Morning",   color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/30",   border: "border-orange-200 dark:border-orange-800" },
  midday:    { icon: Sun,     label: "Midday",     color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-900/30",   border: "border-yellow-200 dark:border-yellow-800" },
  afternoon: { icon: Sun,     label: "Afternoon",  color: "text-teal-500",   bg: "bg-teal-50 dark:bg-teal-900/30",       border: "border-teal-200 dark:border-teal-800" },
  evening:   { icon: Sunset,  label: "Evening",    color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/30",   border: "border-purple-200 dark:border-purple-800" },
  night:     { icon: Moon,    label: "Night",      color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/30",   border: "border-indigo-200 dark:border-indigo-800" },
  anytime:   { icon: Clock,   label: "Anytime",    color: "text-gray-500",   bg: "bg-gray-50 dark:bg-gray-700/40",       border: "border-gray-200 dark:border-gray-700" },
};

const LLM_SCHEMA = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string", enum: ["work","personal","health","creative","learning","household","other"] },
          difficulty: { type: "string", enum: ["easy","medium","hard"] },
          energy_level_needed: { type: "string", enum: ["low","medium","high"] },
          priority: { type: "string", enum: ["low","medium","high","urgent"] },
          task_priority: { type: "string", enum: ["must_do","should_do","could_do"] },
          estimated_minutes: { type: "number" },
          schedule_block: { type: "string", enum: ["morning","midday","afternoon","evening","night","anytime"] },
          suggested_start_time: { type: "string", description: "e.g. '09:00' or '14:30'" },
          is_recurring: { type: "boolean" },
          recurrence_pattern: { type: "string", enum: ["none","daily","weekly","biweekly","monthly"] },
          subtasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                estimated_minutes: { type: "number" },
                order: { type: "number" },
                completed: { type: "boolean" },
              },
            },
          },
        },
      },
    },
    schedule_summary: { type: "string", description: "A brief sentence summarising today's schedule" },
    encouragement: { type: "string" },
  },
};

/* ─── main component ──────────────────────────────────────── */
export default function VoiceTask() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState("record"); // "record" | "results"
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [tasks, setTasks] = useState(null);
  const [encouragement, setEncouragement] = useState("");
  const [scheduleSummary, setScheduleSummary] = useState("");
  const [expandedTask, setExpandedTask] = useState(null);
  const [pulseLevel, setPulseLevel] = useState(0);
  const [viewMode, setViewMode] = useState("schedule"); // "schedule" | "list"

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const silenceTimer = useRef(null);

  /* speech recognition setup */
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setIsSupported(false); return; }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";

    r.onresult = (e) => {
      let final = "";
      let inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " ";
        else inter += t;
      }
      setPulseLevel(Math.random() * 3 + 1);
      setTimeout(() => setPulseLevel(0), 300);
      if (final) setTranscript(prev => prev + final);
      setInterim(inter);
      clearTimeout(silenceTimer.current);
      if (isListeningRef.current) {
        silenceTimer.current = setTimeout(() => {
          if (isListeningRef.current) stopListening();
        }, 4000);
      }
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed") setIsSupported(false);
      setIsListening(false);
      isListeningRef.current = false;
    };
    r.onend = () => { if (isListeningRef.current) r.start(); };
    recognitionRef.current = r;
    return () => { r.stop(); clearTimeout(silenceTimer.current); };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setTranscript(""); setInterim(""); setTasks(null);
    recognitionRef.current.start();
    setIsListening(true);
    isListeningRef.current = true;
  };

  const stopListening = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
    isListeningRef.current = false;
    setInterim("");
    clearTimeout(silenceTimer.current);
  }, []);

  /* auto-process on stop */
  useEffect(() => {
    if (!isListening && transcript.trim() && !isProcessing && !tasks) {
      processTranscript(transcript);
    }
  }, [isListening]);

  const processTranscript = async (text) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a smart daily planner assistant. The user has narrated their tasks or plans for today.

Spoken input: "${text}"

Instructions:
- Extract every distinct task or to-do mentioned
- Infer category, difficulty, energy level, priority (must_do/should_do/could_do) from context
- Assign a schedule_block (morning/midday/afternoon/evening/night/anytime) based on what the user says or what makes sense given the task type
- If the user mentions a specific time, set suggested_start_time (24h format HH:MM)
- Break each task into 2-5 concrete subtasks with time estimates (max 20 min each)
- estimated_minutes = sum of subtask times
- If recurring patterns are mentioned set is_recurring=true and recurrence_pattern
- schedule_summary: one sentence overview of today's plan
- encouragement: one short upbeat motivating sentence`,
        response_json_schema: LLM_SCHEMA,
      });
      setTasks(result.tasks || []);
      setEncouragement(result.encouragement || "Great job capturing your thoughts!");
      setScheduleSummary(result.schedule_summary || "");
      setMode("results");
    } catch {
      toast.error("Failed to process voice input. Please try again.");
    }
    setIsProcessing(false);
  };

  const saveTasksMutation = useMutation({
    mutationFn: (tasksToSave) =>
      Promise.all(tasksToSave.map(t => base44.entities.Task.create({ ...t, status: "not_started" }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tasks saved to your list!");
      navigate(createPageUrl("Tasks"));
    },
  });

  const removeTask = (i) => setTasks(prev => prev.filter((_, idx) => idx !== i));
  const reset = () => { setTasks(null); setTranscript(""); setEncouragement(""); setScheduleSummary(""); setMode("record"); };
  const totalMin = tasks?.reduce((s, t) => s + (t.estimated_minutes || 0), 0) || 0;

  /* group tasks by schedule block */
  const grouped = tasks ? Object.entries(BLOCK_ICONS).reduce((acc, [block]) => {
    const blockTasks = tasks.filter(t => (t.schedule_block || "anytime") === block);
    if (blockTasks.length) acc[block] = blockTasks;
    return acc;
  }, {}) : {};

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg mx-auto mb-4">
            <Mic className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent mb-2">
            Voice to Tasks
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Narrate your day — AI creates tasks, subtasks & a schedule
          </p>
        </motion.div>

        {/* ── RECORD MODE ─────────────────────────────────── */}
        {mode === "record" && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-3xl border border-purple-100 dark:border-gray-700 p-8 flex flex-col items-center gap-6"
          >
            {/* Example prompts */}
            <div className="w-full text-center space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Try saying…</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                "This morning I need to answer emails and prep the presentation. After lunch I'll go to the gym. Tonight I want to read for 30 minutes."
              </p>
            </div>

            {/* Mic button */}
            <div className="relative flex flex-col items-center gap-4">
              <motion.button
                onClick={isListening ? stopListening : startListening}
                disabled={!isSupported}
                whileTap={{ scale: 0.95 }}
                className={`relative w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                  isListening
                    ? "bg-gradient-to-br from-red-500 to-pink-600"
                    : "bg-gradient-to-br from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600"
                }`}
              >
                {isListening && (
                  <>
                    <motion.span className="absolute inset-0 rounded-full border-2 border-red-400 opacity-60"
                      animate={{ scale: [1, 1.6], opacity: [0.6, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
                    <motion.span className="absolute inset-0 rounded-full border-2 border-red-300 opacity-40"
                      animate={{ scale: [1, 2], opacity: [0.4, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }} />
                  </>
                )}
                {isListening
                  ? <Square className="w-10 h-10 text-white fill-white" />
                  : <Mic className="w-10 h-10 text-white" />}
              </motion.button>

              {/* Waveform */}
              <AnimatePresence>
                {isListening && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-end gap-1 h-8">
                    {Array.from({ length: 14 }).map((_, i) => (
                      <motion.div key={i} className="w-1.5 rounded-full bg-gradient-to-t from-purple-500 to-teal-400"
                        animate={{ height: pulseLevel > 0 ? `${Math.max(6, Math.random() * 28 + 6)}px` : "8px" }}
                        transition={{ duration: 0.15, delay: i * 0.02 }} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {!isSupported ? "Speech recognition not supported in this browser"
                  : isListening ? "🔴 Listening… tap to stop (or pause 4s)"
                  : "Tap to start narrating your day"}
              </p>
            </div>

            {/* Live transcript */}
            <AnimatePresence>
              {(transcript || interim) && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="w-full">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-purple-100 dark:border-gray-600 p-4 min-h-[80px]">
                    <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                      {transcript}<span className="text-gray-400 italic">{interim}</span>
                    </p>
                    {transcript && !isListening && (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" onClick={() => { setTranscript(""); setInterim(""); }}>
                          <RefreshCcw className="w-3.5 h-3.5 mr-1" /> Clear
                        </Button>
                        <Button size="sm" onClick={() => processTranscript(transcript)} className="bg-gradient-to-r from-purple-500 to-teal-500 text-white border-0">
                          <Wand2 className="w-3.5 h-3.5 mr-1" /> Parse & Schedule
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Type fallback */}
            {!isListening && !transcript && (
              <div className="w-full space-y-2">
                <p className="text-xs text-center text-gray-400">— or type your plans —</p>
                <Textarea
                  id="voice-fallback-textarea"
                  placeholder="e.g. Morning: call dentist, review budget report. Afternoon: gym session. Evening: grocery run and cook dinner..."
                  className="min-h-[90px] resize-none text-sm"
                />
                <Button size="sm" variant="outline" className="w-full"
                  onClick={() => {
                    const ta = document.getElementById("voice-fallback-textarea");
                    if (ta?.value?.trim()) { setTranscript(ta.value); processTranscript(ta.value); }
                  }}>
                  <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Parse & Schedule with AI
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── PROCESSING ──────────────────────────────────── */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-3xl border border-purple-100 dark:border-gray-700 p-12 flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white animate-pulse" />
                </div>
                <motion.div className="absolute inset-0 rounded-full border-2 border-purple-400"
                  animate={{ scale: [1, 1.5], opacity: [0.8, 0] }} transition={{ duration: 1, repeat: Infinity }} />
              </div>
              <p className="font-semibold text-gray-700 dark:text-gray-200">Building your daily schedule…</p>
              <p className="text-sm text-gray-400">Parsing tasks, subtasks & time blocks</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── RESULTS MODE ────────────────────────────────── */}
        <AnimatePresence>
          {mode === "results" && tasks && !isProcessing && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {/* Summary banner */}
              <div className="bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-900/30 dark:to-teal-900/30 rounded-2xl border border-purple-100 dark:border-purple-800 p-4 flex items-start gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-100">{encouragement}</p>
                  {scheduleSummary && <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{scheduleSummary}</p>}
                  <p className="text-xs text-gray-400 mt-1">{tasks.length} tasks · ~{totalMin} min total</p>
                </div>
              </div>

              {/* View toggle */}
              <div className="flex gap-2">
                <Button size="sm" variant={viewMode === "schedule" ? "default" : "outline"}
                  onClick={() => setViewMode("schedule")}
                  className={viewMode === "schedule" ? "bg-gradient-to-r from-purple-500 to-teal-500 text-white border-0" : ""}>
                  <Calendar className="w-3.5 h-3.5 mr-1.5" /> Schedule View
                </Button>
                <Button size="sm" variant={viewMode === "list" ? "default" : "outline"}
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "bg-gradient-to-r from-purple-500 to-teal-500 text-white border-0" : ""}>
                  <ListTodo className="w-3.5 h-3.5 mr-1.5" /> List View
                </Button>
              </div>

              {/* ── SCHEDULE VIEW ── */}
              {viewMode === "schedule" && (
                <div className="space-y-3">
                  {Object.entries(grouped).map(([block, blockTasks]) => {
                    const meta = BLOCK_ICONS[block];
                    const Icon = meta.icon;
                    const blockMin = blockTasks.reduce((s, t) => s + (t.estimated_minutes || 0), 0);
                    return (
                      <motion.div key={block} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        className={`rounded-2xl border ${meta.border} ${meta.bg} overflow-hidden`}>
                        {/* Block header */}
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-current/10">
                          <Icon className={`w-4 h-4 ${meta.color}`} />
                          <span className={`font-semibold text-sm ${meta.color}`}>{meta.label}</span>
                          <span className="text-xs text-gray-400 ml-auto">{blockMin} min</span>
                        </div>
                        {/* Tasks in block */}
                        <div className="divide-y divide-white/30 dark:divide-gray-700/30">
                          {blockTasks.map((task, gi) => {
                            const taskIdx = tasks.indexOf(task);
                            return (
                              <div key={gi} className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-sm">{CATEGORY_EMOJIS[task.category] || "📌"}</span>
                                      <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{task.title}</span>
                                      {task.suggested_start_time && (
                                        <Badge variant="outline" className="text-xs px-1.5 py-0">🕐 {task.suggested_start_time}</Badge>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {task.task_priority && (
                                        <Badge className={`text-xs border ${PRIORITY_STYLES[task.task_priority]}`}>{PRIORITY_LABELS[task.task_priority]}</Badge>
                                      )}
                                      <Badge variant="outline" className="text-xs">{task.difficulty}</Badge>
                                      <Badge variant="outline" className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{task.estimated_minutes}m</Badge>
                                      {task.is_recurring && (
                                        <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200"><Repeat className="w-3 h-3 mr-1" />{task.recurrence_pattern}</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {task.subtasks?.length > 0 && (
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-purple-600"
                                        onClick={() => setExpandedTask(expandedTask === taskIdx ? null : taskIdx)}>
                                        {expandedTask === taskIdx ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-500"
                                      onClick={() => removeTask(taskIdx)}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                                {/* Subtasks */}
                                <AnimatePresence>
                                  {expandedTask === taskIdx && task.subtasks?.length > 0 && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                      className="mt-2 ml-5 space-y-1">
                                      {task.subtasks.map((st, si) => (
                                        <div key={si} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                          <span className="w-4 h-4 rounded-full bg-white/60 dark:bg-gray-700 flex items-center justify-center text-purple-600 font-bold text-[10px] flex-shrink-0">{si + 1}</span>
                                          <span className="flex-1">{st.title}</span>
                                          <span className="text-gray-400">{st.estimated_minutes}m</span>
                                        </div>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* ── LIST VIEW ── */}
              {viewMode === "list" && (
                <div className="space-y-3">
                  {tasks.map((task, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      className="bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-2xl border border-purple-100 dark:border-gray-700 overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className="text-base">{CATEGORY_EMOJIS[task.category] || "📌"}</span>
                              <h3 className="font-bold text-gray-900 dark:text-gray-100">{task.title}</h3>
                              {task.suggested_start_time && (
                                <Badge variant="outline" className="text-xs">🕐 {task.suggested_start_time}</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {task.task_priority && (
                                <Badge className={`text-xs border ${PRIORITY_STYLES[task.task_priority]}`}>{PRIORITY_LABELS[task.task_priority]}</Badge>
                              )}
                              {task.schedule_block && task.schedule_block !== "anytime" && (
                                <Badge variant="outline" className="text-xs capitalize">{task.schedule_block}</Badge>
                              )}
                              <Badge variant="outline" className="text-xs">{task.category}</Badge>
                              <Badge variant="outline" className="text-xs">{task.difficulty}</Badge>
                              <Badge variant="outline" className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{task.estimated_minutes}m</Badge>
                              {task.is_recurring && (
                                <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200"><Repeat className="w-3 h-3 mr-1" />{task.recurrence_pattern}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-purple-600"
                              onClick={() => setExpandedTask(expandedTask === i ? null : i)}>
                              {expandedTask === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => removeTask(i)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <AnimatePresence>
                        {expandedTask === i && task.subtasks?.length > 0 && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="border-t border-purple-50 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700">
                            {task.subtasks.map((st, si) => (
                              <div key={si} className="flex items-center gap-3 px-4 py-2.5 bg-gray-50/50 dark:bg-gray-700/30">
                                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400 flex-shrink-0">{si + 1}</span>
                                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{st.title}</span>
                                <span className="text-xs text-gray-400">{st.estimated_minutes}m</span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={reset} className="flex-1">
                  <RefreshCcw className="w-4 h-4 mr-1.5" /> Start Over
                </Button>
                <Button onClick={() => saveTasksMutation.mutate(tasks)}
                  disabled={saveTasksMutation.isPending || tasks.length === 0}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold shadow-lg border-0">
                  {saveTasksMutation.isPending
                    ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</>
                    : <><Save className="w-4 h-4 mr-1.5" /> Save All ({tasks.length})</>}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}