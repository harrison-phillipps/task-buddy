import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Zap, ChevronDown, ChevronUp, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const MOODS = ["energized", "focused", "neutral", "tired", "anxious"];
const MOOD_EMOJI = { energized: "⚡", focused: "🎯", neutral: "😐", tired: "😴", anxious: "😰" };
const STORAGE_KEY = "quickFocusConfig";

export default function QuickFocusWidget({ currentUser, tasks = [], sessions = [] }) {
  const navigate = useNavigate();
  const [showConfig, setShowConfig] = useState(false);
  const [launching, setLaunching] = useState(false);

  // Load saved config from localStorage
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : { taskId: null, mood: "focused", technique: "standard" };
    } catch {
      return { taskId: null, mood: "focused", technique: "standard" };
    }
  });

  // Auto-detect most frequent task from sessions if no config saved
  useEffect(() => {
    if (!config.taskId && sessions.length > 0 && tasks.length > 0) {
      const freq = {};
      sessions.forEach(s => { if (s.task_id) freq[s.task_id] = (freq[s.task_id] || 0) + 1; });
      const topId = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
      const topTask = tasks.find(t => t.id === topId && t.status !== "completed");
      if (topTask) {
        const updated = { ...config, taskId: topTask.id };
        setConfig(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    }
  }, [sessions, tasks]);

  const saveConfig = (updates) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const activeTasks = tasks.filter(t => t.status !== "completed");
  const selectedTask = activeTasks.find(t => t.id === config.taskId);

  const handleLaunch = () => {
    if (!selectedTask) return;
    setLaunching(true);
    // Navigate to FocusSession with task pre-selected and mood pre-configured
    const params = new URLSearchParams({
      taskId: selectedTask.id,
      taskTitle: encodeURIComponent(selectedTask.title),
      mood: config.mood,
      technique: config.technique,
      quickStart: "1",
    });
    setTimeout(() => {
      navigate(`${createPageUrl("FocusSession")}?${params.toString()}`);
    }, 400);
  };

  if (activeTasks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden shadow-lg border border-purple-200 dark:border-purple-800"
    >
      {/* Main widget */}
      <div className="bg-gradient-to-r from-purple-500 to-teal-500 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-white" />
            <span className="text-white font-bold text-sm">Quick Focus</span>
          </div>
          <button
            onClick={() => setShowConfig(v => !v)}
            className="text-white/80 hover:text-white transition-colors p-1"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {selectedTask ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-base truncate">{selectedTask.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-white/20 text-white text-xs border-0 px-2 py-0">
                  {MOOD_EMOJI[config.mood]} {config.mood}
                </Badge>
                <Badge className="bg-white/20 text-white text-xs border-0 px-2 py-0">
                  {config.technique === "pomodoro" ? "🍅 Pomodoro" : "⏱ Standard"}
                </Badge>
                {selectedTask.subtasks?.length > 0 && (
                  <Badge className="bg-white/20 text-white text-xs border-0 px-2 py-0">
                    {selectedTask.subtasks.filter(s => !s.completed).length} steps left
                  </Badge>
                )}
              </div>
            </div>
            <motion.button
              onClick={handleLaunch}
              whileTap={{ scale: 0.93 }}
              disabled={launching}
              className="flex-shrink-0 bg-white text-purple-600 font-bold rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-purple-50 transition-colors disabled:opacity-70"
            >
              {launching ? (
                <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </motion.button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfig(true)}
            className="w-full text-center text-white/80 text-sm py-2 border border-white/30 rounded-xl hover:bg-white/10 transition-colors"
          >
            Tap ⚙️ to pick your focus task
          </button>
        )}
      </div>

      {/* Config panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-white dark:bg-gray-800 border-t border-purple-100 dark:border-gray-700"
          >
            <div className="p-4 space-y-4">
              {/* Task picker */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Task</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {activeTasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => saveConfig({ taskId: task.id })}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2 ${
                        config.taskId === task.id
                          ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-semibold"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <span className="truncate">{task.title}</span>
                      {task.subtasks?.length > 0 && (
                        <span className="text-xs text-gray-400 flex-shrink-0">{task.subtasks.length} steps</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood picker */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Default Mood</p>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map(mood => (
                    <button
                      key={mood}
                      onClick={() => saveConfig({ mood })}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        config.mood === mood
                          ? "bg-purple-500 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                      }`}
                    >
                      {MOOD_EMOJI[mood]} {mood}
                    </button>
                  ))}
                </div>
              </div>

              {/* Technique picker */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Technique</p>
                <div className="flex gap-2">
                  {[{ id: "standard", label: "⏱ Standard" }, { id: "pomodoro", label: "🍅 Pomodoro" }].map(t => (
                    <button
                      key={t.id}
                      onClick={() => saveConfig({ technique: t.id })}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        config.technique === t.id
                          ? "bg-purple-500 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowConfig(false)}
                className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}