import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Mic, MicOff, Square, Sparkles, CheckCircle, Loader2,
  Clock, Trash2, Save, RefreshCcw, Repeat, ChevronDown, ChevronUp, Wand2
} from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

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
    encouragement: { type: "string" },
  },
};

export default function VoiceTask() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [tasks, setTasks] = useState(null);
  const [encouragement, setEncouragement] = useState("");
  const [expandedTask, setExpandedTask] = useState(null);
  const [pulseLevel, setPulseLevel] = useState(0);

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const silenceTimer = useRef(null);

  // Init speech recognition
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

    r.onend = () => {
      if (isListeningRef.current) r.start();
    };

    recognitionRef.current = r;
    return () => {
      r.stop();
      clearTimeout(silenceTimer.current);
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setTranscript("");
    setInterim("");
    setTasks(null);
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

  // Auto-process when listening stops and there's content
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
        prompt: `You are a productivity assistant. Parse the following spoken thoughts into structured tasks.
        
Spoken input: "${text}"

Instructions:
- Extract every distinct task or to-do mentioned
- Infer category, difficulty, energy level, priority (must_do/should_do/could_do) from context
- Break each task into 2-5 concrete subtasks with time estimates (max 20 min each)
- estimated_minutes = sum of subtask times
- If recurring patterns are mentioned (daily, weekly, etc.) set is_recurring=true
- encouragement: one short upbeat motivating sentence`,
        response_json_schema: LLM_SCHEMA,
      });
      setTasks(result.tasks || []);
      setEncouragement(result.encouragement || "Great job capturing your thoughts!");
    } catch (err) {
      toast.error("Failed to process voice input. Please try again.");
    }
    setIsProcessing(false);
  };

  const saveTasksMutation = useMutation({
    mutationFn: (tasksToSave) =>
      Promise.all(tasksToSave.map(t => base44.entities.Task.create({ ...t, status: "not_started" }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tasks saved!");
      navigate(createPageUrl("Tasks"));
    },
  });

  const removeTask = (i) => setTasks(prev => prev.filter((_, idx) => idx !== i));

  const totalMin = tasks?.reduce((s, t) => s + (t.estimated_minutes || 0), 0) || 0;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg mx-auto mb-4">
            <Mic className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent mb-2">
            Voice to Tasks
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Speak your mind — AI turns it into structured tasks</p>
        </motion.div>

        {/* Microphone area */}
        {!tasks && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-3xl border border-purple-100 dark:border-gray-700 p-8 flex flex-col items-center gap-6"
          >
            {/* Mic button with waveform */}
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
                {/* Pulse rings when listening */}
                {isListening && (
                  <>
                    <motion.span
                      className="absolute inset-0 rounded-full border-2 border-red-400 opacity-60"
                      animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <motion.span
                      className="absolute inset-0 rounded-full border-2 border-red-300 opacity-40"
                      animate={{ scale: [1, 2], opacity: [0.4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                    />
                  </>
                )}
                {isListening
                  ? <Square className="w-10 h-10 text-white fill-white" />
                  : <Mic className="w-10 h-10 text-white" />
                }
              </motion.button>

              {/* Waveform bars */}
              <AnimatePresence>
                {isListening && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-end gap-1 h-8">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 rounded-full bg-gradient-to-t from-purple-500 to-teal-400"
                        animate={{ height: pulseLevel > 0 ? `${Math.max(6, Math.random() * 28 + 6)}px` : "8px" }}
                        transition={{ duration: 0.15, delay: i * 0.02 }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {!isSupported ? "Speech recognition not supported in this browser"
                  : isListening ? "🔴 Listening... tap to stop (or pause for 4s)"
                  : "Tap to start speaking"}
              </p>
            </div>

            {/* Live transcript */}
            <AnimatePresence>
              {(transcript || interim) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full"
                >
                  <div className="relative bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-purple-100 dark:border-gray-600 p-4 min-h-[80px]">
                    <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                      {transcript}
                      <span className="text-gray-400 italic">{interim}</span>
                    </p>
                    {transcript && !isListening && (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" onClick={() => { setTranscript(""); setInterim(""); }}>
                          <RefreshCcw className="w-3.5 h-3.5 mr-1" /> Clear
                        </Button>
                        <Button size="sm" onClick={() => processTranscript(transcript)} className="bg-gradient-to-r from-purple-500 to-teal-500 text-white border-0">
                          <Wand2 className="w-3.5 h-3.5 mr-1" /> Parse Tasks
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Or type fallback */}
            {!isListening && !transcript && (
              <div className="w-full space-y-2">
                <p className="text-xs text-center text-gray-400">— or type your thoughts —</p>
                <Textarea
                  placeholder="e.g. I need to call my dentist, buy groceries, and finish the project report by Friday..."
                  className="min-h-[80px] resize-none text-sm"
                  onBlur={(e) => { if (e.target.value.trim()) setTranscript(e.target.value); }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    const ta = e.currentTarget.previousElementSibling;
                    if (ta?.value?.trim()) { setTranscript(ta.value); processTranscript(ta.value); }
                  }}
                >
                  <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Parse with AI
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* Processing */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-3xl border border-purple-100 dark:border-gray-700 p-12 flex flex-col items-center gap-4"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white animate-pulse" />
                </div>
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-purple-400"
                  animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </div>
              <p className="font-semibold text-gray-700 dark:text-gray-200">AI is parsing your tasks...</p>
              <p className="text-sm text-gray-400">Inferring categories, priorities & subtasks</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {tasks && !isProcessing && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Encouragement + summary */}
              <div className="bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-900/30 dark:to-teal-900/30 rounded-2xl border border-purple-100 dark:border-purple-800 p-4 flex items-start gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-100">{encouragement}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {tasks.length} tasks · ~{totalMin} min total
                  </p>
                </div>
              </div>

              {/* Task cards */}
              {tasks.map((task, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-2xl border border-purple-100 dark:border-gray-700 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="text-base">{CATEGORY_EMOJIS[task.category] || "📌"}</span>
                          <h3 className="font-bold text-gray-900 dark:text-gray-100">{task.title}</h3>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {task.task_priority && (
                            <Badge className={`text-xs border ${PRIORITY_STYLES[task.task_priority]}`}>
                              {PRIORITY_LABELS[task.task_priority]}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{task.category}</Badge>
                          <Badge variant="outline" className="text-xs">{task.difficulty}</Badge>
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" />{task.estimated_minutes}m
                          </Badge>
                          {task.is_recurring && (
                            <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                              <Repeat className="w-3 h-3 mr-1" />{task.recurrence_pattern}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-purple-600"
                          onClick={() => setExpandedTask(expandedTask === i ? null : i)}
                        >
                          {expandedTask === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-red-500"
                          onClick={() => removeTask(i)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Subtasks */}
                  <AnimatePresence>
                    {expandedTask === i && task.subtasks?.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-purple-50 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700"
                      >
                        {task.subtasks.map((st, si) => (
                          <div key={si} className="flex items-center gap-3 px-4 py-2.5 bg-gray-50/50 dark:bg-gray-700/30">
                            <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400 flex-shrink-0">
                              {si + 1}
                            </span>
                            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{st.title}</span>
                            <span className="text-xs text-gray-400">{st.estimated_minutes}m</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => { setTasks(null); setTranscript(""); setEncouragement(""); }}
                  className="flex-1"
                >
                  <RefreshCcw className="w-4 h-4 mr-1.5" /> Start Over
                </Button>
                <Button
                  onClick={() => saveTasksMutation.mutate(tasks)}
                  disabled={saveTasksMutation.isPending || tasks.length === 0}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold shadow-lg border-0"
                >
                  {saveTasksMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-1.5" /> Save All ({tasks.length})</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}