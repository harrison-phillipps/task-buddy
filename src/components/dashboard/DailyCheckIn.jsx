import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Target, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const STORAGE_KEY = "daily_checkin_date";
const GOALS_KEY = "daily_checkin_goals";

export default function DailyCheckIn({ currentUser }) {
  const [show, setShow] = useState(false);
  const [goals, setGoals] = useState(["", "", ""]);
  const [saved, setSaved] = useState(false);
  const [savedGoals, setSavedGoals] = useState(null);

  useEffect(() => {
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem(STORAGE_KEY);
    const storedGoals = localStorage.getItem(GOALS_KEY);

    if (lastDate === today && storedGoals) {
      // Already completed today — show the summary
      setSavedGoals(JSON.parse(storedGoals));
      setSaved(true);
      setShow(true);
    } else if (lastDate !== today) {
      // New day — show the prompt (only in morning/afternoon)
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 18) {
        setShow(true);
      }
    }
  }, []);

  const handleSave = () => {
    const filled = goals.filter(g => g.trim());
    if (filled.length === 0) return;

    const today = new Date().toDateString();
    localStorage.setItem(STORAGE_KEY, today);
    localStorage.setItem(GOALS_KEY, JSON.stringify(filled));
    setSavedGoals(filled);
    setSaved(true);
  };

  const handleDismiss = () => {
    const today = new Date().toDateString();
    localStorage.setItem(STORAGE_KEY, today);
    setShow(false);
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(GOALS_KEY);
    setGoals(["", "", ""]);
    setSaved(false);
    setSavedGoals(null);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        className="bg-gradient-to-br from-purple-50 to-teal-50 dark:from-purple-900/30 dark:to-teal-900/30 border border-purple-200 dark:border-purple-700 rounded-2xl p-5 shadow-sm"
      >
        {saved ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-500" />
                <h3 className="font-bold text-gray-900 dark:text-gray-100">Today's Top 3</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="text-xs text-purple-500 hover:underline"
                >
                  Edit
                </button>
                <button onClick={() => setShow(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <ol className="space-y-2">
              {savedGoals?.map((goal, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 text-xs flex items-center justify-center font-bold mt-0.5">
                    {i + 1}
                  </span>
                  {goal}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-gray-900 dark:text-gray-100">Morning Check-In ☀️</h3>
              </div>
              <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              What are your top 3 goals for today?
            </p>
            <div className="space-y-2 mb-4">
              {goals.map((goal, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => {
                      const updated = [...goals];
                      updated[i] = e.target.value;
                      setGoals(updated);
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                    placeholder={`Goal ${i + 1}…`}
                    className="flex-1 text-sm bg-white dark:bg-gray-800 border border-purple-200 dark:border-gray-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400 dark:text-gray-100 placeholder:text-gray-400"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={goals.every(g => !g.trim())}
                className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold flex-1"
              >
                <Target className="w-4 h-4 mr-2" />
                Set My Goals
              </Button>
              <Button variant="ghost" onClick={handleDismiss} className="text-gray-500">
                Skip
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}