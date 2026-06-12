import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Sparkles } from "lucide-react";

const SUGGESTIONS = {
  child: [
    { title: "Pack up toys", category: "household" },
    { title: "Brush teeth", category: "health" },
    { title: "Get school bag ready", category: "personal" },
    { title: "Have a shower", category: "health" },
    { title: "Feed the pet", category: "household" },
    { title: "Tidy bedroom", category: "household" },
  ],
  teen: [
    { title: "Finish homework", category: "personal" },
    { title: "Tidy room", category: "household" },
    { title: "Prepare for tomorrow", category: "personal" },
    { title: "Reply to messages", category: "personal" },
    { title: "Do the dishes", category: "household" },
    { title: "Pack school bag", category: "personal" },
  ],
  adult: [
    { title: "Call the doctor", category: "health" },
    { title: "Pay a bill", category: "personal" },
    { title: "Clean the kitchen", category: "household" },
    { title: "Do laundry", category: "household" },
    { title: "Reply to emails", category: "work" },
    { title: "Prepare for tomorrow", category: "personal" },
  ],
};

export default function SuggestedTaskChips({ currentUser, onTaskAdded }) {
  const [added, setAdded] = useState(new Set());
  const [loading, setLoading] = useState(null);

  const profileType = currentUser?.profile_type || "adult";
  const suggestions = SUGGESTIONS[profileType] || SUGGESTIONS.adult;

  const handleAdd = async (suggestion) => {
    if (added.has(suggestion.title) || loading) return;
    setLoading(suggestion.title);
    try {
      await base44.entities.Task.create({
        title: suggestion.title,
        category: suggestion.category,
        difficulty: "easy",
        status: "not_started",
        subtasks: [],
      });
      setAdded(prev => new Set([...prev, suggestion.title]));
      if (onTaskAdded) onTaskAdded();
    } catch (e) {
      console.error("Failed to add task", e);
    }
    setLoading(null);
  };

  return (
    <div className="space-y-3 p-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-purple-100 dark:border-purple-900/40">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-500" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Quick-add a task to get started</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => {
          const isAdded = added.has(s.title);
          const isLoading = loading === s.title;
          return (
            <button
              key={s.title}
              onClick={() => handleAdd(s)}
              disabled={isAdded || !!loading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                isAdded
                  ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 cursor-default"
                  : "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 active:scale-95"
              } disabled:opacity-60`}
            >
              {isAdded ? (
                <span>✓ {s.title}</span>
              ) : (
                <>
                  <Plus className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                  {s.title}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}