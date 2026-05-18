import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, ChevronDown, Loader2, Plus, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = ["work", "personal", "health", "creative", "learning", "household", "other"];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const EMOJI = { work: "💼", personal: "🙂", health: "💪", creative: "🎨", learning: "📚", household: "🏠", other: "📌" };

export default function QuickAdd() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("personal");
  const [priority, setPriority] = useState("medium");
  const [showOptions, setShowOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await base44.entities.Task.create({
        title: title.trim(),
        category,
        priority,
        status: "not_started",
        subtasks: [],
      });
      setSaved(true);
      setTimeout(() => {
        setTitle("");
        setCategory("personal");
        setPriority("medium");
        setSaved(false);
        setShowOptions(false);
      }, 1800);
    } catch (e) {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && title.trim()) handleSave();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-teal-50 dark:from-[#1a1025] dark:via-[#12101a] dark:to-[#0f1a1f] flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Plus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Quick Add Task</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Capture it fast, sort it later</p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 space-y-4">
          {/* Title input */}
          <div>
            <textarea
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What needs to be done?"
              rows={3}
              className="w-full text-lg font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-gray-50 dark:bg-gray-700 border-0 rounded-2xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Toggle options */}
          <button
            onClick={() => setShowOptions(v => !v)}
            className="w-full flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors px-1"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              {showOptions ? "Less options" : "Category & Priority"}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showOptions ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-4"
              >
                {/* Category */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Category</p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          category === cat
                            ? "bg-purple-500 text-white shadow-md"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {EMOJI[cat]} {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Priority</p>
                  <div className="grid grid-cols-4 gap-2">
                    {PRIORITIES.map(p => {
                      const colors = {
                        low: "bg-green-100 text-green-700 border-green-300",
                        medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
                        high: "bg-orange-100 text-orange-700 border-orange-300",
                        urgent: "bg-red-100 text-red-700 border-red-300",
                      };
                      const activeColors = {
                        low: "bg-green-500 text-white border-green-500",
                        medium: "bg-yellow-500 text-white border-yellow-500",
                        high: "bg-orange-500 text-white border-orange-500",
                        urgent: "bg-red-500 text-white border-red-500",
                      };
                      return (
                        <button
                          key={p}
                          onClick={() => setPriority(p)}
                          className={`py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            priority === p ? activeColors[p] : colors[p]
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          {/* Save button */}
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.div
                key="saved"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="w-full py-4 bg-gradient-to-r from-green-400 to-teal-400 rounded-2xl flex items-center justify-center gap-2 text-white font-semibold text-lg shadow-lg"
              >
                <CheckCircle className="w-5 h-5" />
                Task Added!
              </motion.div>
            ) : (
              <motion.button
                key="save"
                onClick={handleSave}
                disabled={!title.trim() || saving}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl flex items-center justify-center gap-2 text-white font-semibold text-lg shadow-lg transition-all active:scale-95"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                {saving ? "Saving..." : "Add Task"}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Footer links */}
        <div className="flex justify-center gap-6 mt-6 text-sm text-gray-400">
          <a href="/Tasks" className="hover:text-purple-500 transition-colors">View All Tasks</a>
          <a href="/" className="hover:text-purple-500 transition-colors">Dashboard</a>
        </div>
      </motion.div>
    </div>
  );
}