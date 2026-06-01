import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Star, ChevronDown, ChevronUp, Trash2, BookOpen, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

const TODAY = new Date().toISOString().split("T")[0];

const MOODS = [
  { key: "amazing", emoji: "🤩", label: "Amazing" },
  { key: "good",    emoji: "😊", label: "Good" },
  { key: "okay",    emoji: "😐", label: "Okay" },
  { key: "tough",   emoji: "😔", label: "Tough" },
];

const WIN_PROMPTS = [
  "I showed up today",
  "I helped someone",
  "I finished a task",
  "I learned something new",
  "I didn't give up",
  "I took a break when needed",
  "I made progress on a goal",
  "I did something kind for myself",
];

export default function WinsJournal() {
  const [entry, setEntry] = useState(null);
  const [newWin, setNewWin] = useState("");
  const [mood, setMood] = useState("good");
  const [reflection, setReflection] = useState("");
  const [showPast, setShowPast] = useState(false);
  const [pastEntries, setPastEntries] = useState([]);
  const [loadingPast, setLoadingPast] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);

  useEffect(() => {
    loadTodayEntry();
  }, []);

  const loadTodayEntry = async () => {
    const results = await base44.entities.WinsJournal.filter({ entry_date: TODAY });
    if (results.length > 0) {
      const e = results[0];
      setEntry(e);
      setMood(e.mood || "good");
      setReflection(e.reflection || "");
    }
  };

  const saveEntry = async (updatedWins, updatedMood, updatedReflection) => {
    setSaving(true);
    if (entry) {
      const updated = await base44.entities.WinsJournal.update(entry.id, {
        wins: updatedWins,
        mood: updatedMood,
        reflection: updatedReflection,
      });
      setEntry(updated);
    } else {
      const created = await base44.entities.WinsJournal.create({
        entry_date: TODAY,
        wins: updatedWins,
        mood: updatedMood,
        reflection: updatedReflection,
      });
      setEntry(created);
    }
    setSaving(false);
  };

  const handleAddWin = async () => {
    const text = newWin.trim();
    if (!text) return;
    const currentWins = entry?.wins || [];
    const updated = [...currentWins, text];
    setNewWin("");
    setShowPrompts(false);
    await saveEntry(updated, mood, reflection);
  };

  const handleRemoveWin = async (index) => {
    const updated = (entry?.wins || []).filter((_, i) => i !== index);
    await saveEntry(updated, mood, reflection);
  };

  const handleMoodChange = async (newMood) => {
    setMood(newMood);
    await saveEntry(entry?.wins || [], newMood, reflection);
  };

  const handleReflectionBlur = async () => {
    await saveEntry(entry?.wins || [], mood, reflection);
  };

  const loadPastEntries = async () => {
    if (loadingPast) return;
    setLoadingPast(true);
    const all = await base44.entities.WinsJournal.list("-entry_date", 14);
    setPastEntries(all.filter(e => e.entry_date !== TODAY));
    setLoadingPast(false);
  };

  const togglePast = () => {
    if (!showPast) loadPastEntries();
    setShowPast(p => !p);
  };

  const wins = entry?.wins || [];

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-yellow-200 dark:border-yellow-800 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-b border-yellow-100 dark:border-yellow-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⭐</span>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Today's Wins</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {format(new Date(), "EEEE, MMMM d")} · No win is too small
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Mood picker */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">How's today feeling?</p>
          <div className="flex gap-2">
            {MOODS.map(m => (
              <button
                key={m.key}
                onClick={() => handleMoodChange(m.key)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-medium transition-all ${
                  mood === m.key
                    ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                    : "border-gray-200 dark:border-gray-600 text-gray-500 hover:border-yellow-300"
                }`}
              >
                <span className="text-xl">{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Wins list */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            My wins today {wins.length > 0 && <span className="text-yellow-600 font-bold">({wins.length})</span>}
          </p>

          <AnimatePresence>
            {wins.map((win, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-start gap-2 mb-2 group"
              >
                <Star className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-1" />
                <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{win}</span>
                <button
                  onClick={() => handleRemoveWin(i)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-300 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {wins.length === 0 && (
            <p className="text-sm text-gray-400 italic mb-3">Add your first win — even "I got out of bed" counts! 💛</p>
          )}

          {/* Add win input */}
          <div className="flex gap-2 mt-3">
            <Input
              value={newWin}
              onChange={e => setNewWin(e.target.value)}
              placeholder="What went well today?"
              className="flex-1 text-sm"
              onKeyDown={e => e.key === 'Enter' && handleAddWin()}
            />
            <Button
              onClick={handleAddWin}
              disabled={!newWin.trim() || saving}
              size="sm"
              className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold px-3"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Prompt suggestions */}
          <button
            onClick={() => setShowPrompts(p => !p)}
            className="mt-2 text-xs text-purple-500 hover:text-purple-700 flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            {showPrompts ? "Hide prompts" : "Need inspiration?"}
          </button>
          <AnimatePresence>
            {showPrompts && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 mt-2">
                  {WIN_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => { setNewWin(p); setShowPrompts(false); }}
                      className="text-xs px-3 py-1.5 rounded-full border border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20 transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Reflection */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Reflection (optional)</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[
              "What was the hardest thing I did today?",
              "What am I most proud of?",
              "What did I learn today?",
              "How did I show up for myself?",
              "What would I do differently?",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => setReflection(r => r ? r + " " + prompt : prompt)}
                className="text-xs px-2.5 py-1 rounded-full border border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
          <Textarea
            value={reflection}
            onChange={e => setReflection(e.target.value)}
            onBlur={handleReflectionBlur}
            placeholder="Anything else you want to remember about today…"
            className="h-20 text-sm resize-none"
          />
        </div>

        {/* Past entries toggle */}
        <button
          onClick={togglePast}
          className="w-full flex items-center justify-between text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 pt-2 border-t border-gray-100 dark:border-gray-700"
        >
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            Past journal entries
          </span>
          {showPast ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {showPast && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden space-y-3"
            >
              {loadingPast && <p className="text-sm text-gray-400 text-center py-2">Loading…</p>}
              {!loadingPast && pastEntries.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">No past entries yet</p>
              )}
              {pastEntries.map(e => (
                <div key={e.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {format(new Date(e.entry_date + "T00:00:00"), "EEEE, MMM d")}
                    </span>
                    <span className="text-base">{MOODS.find(m => m.key === e.mood)?.emoji || "😊"}</span>
                  </div>
                  {(e.wins || []).map((w, i) => (
                    <div key={i} className="flex items-start gap-1.5 mb-1">
                      <Star className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">{w}</span>
                    </div>
                  ))}
                  {e.reflection && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2 border-t border-gray-200 dark:border-gray-600 pt-2">{e.reflection}</p>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}