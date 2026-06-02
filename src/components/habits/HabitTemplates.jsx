import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Sparkles, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const TEMPLATES = [
  {
    label: "Morning Routine",
    emoji: "🌅",
    routine: "morning",
    habits: [
      { title: "Drink a glass of water", icon: "💧", color: "#3B82F6" },
      { title: "5-minute stretch", icon: "🧘", color: "#8B5CF6" },
      { title: "Journaling", icon: "📓", color: "#F59E0B" },
      { title: "Read for 10 minutes", icon: "📖", color: "#10B981" },
    ],
  },
  {
    label: "Wind Down",
    emoji: "🌙",
    routine: "evening",
    habits: [
      { title: "No screens 30 min before bed", icon: "📵", color: "#6366F1" },
      { title: "Review tomorrow's tasks", icon: "✅", color: "#8B5CF6" },
      { title: "Gratitude — 3 things", icon: "🙏", color: "#F59E0B" },
      { title: "10-minute walk", icon: "🚶", color: "#10B981" },
    ],
  },
  {
    label: "Fitness Basics",
    emoji: "💪",
    routine: "anytime",
    habits: [
      { title: "30-minute workout", icon: "🏋️", color: "#EF4444" },
      { title: "Hit daily step goal", icon: "👟", color: "#F97316" },
      { title: "Drink 8 glasses of water", icon: "💧", color: "#3B82F6", target_count: 8 },
    ],
  },
  {
    label: "Deep Work",
    emoji: "🎯",
    routine: "anytime",
    habits: [
      { title: "90-min focus block", icon: "⏱️", color: "#8B5CF6" },
      { title: "No social media before noon", icon: "🚫", color: "#EF4444" },
      { title: "Plan tomorrow's priorities", icon: "📋", color: "#14B8A6" },
    ],
  },
  {
    label: "Mindfulness",
    emoji: "🧘",
    routine: "morning",
    habits: [
      { title: "10-minute meditation", icon: "🧘", color: "#8B5CF6" },
      { title: "Breathwork (box breathing)", icon: "🌬️", color: "#3B82F6" },
      { title: "Set an intention for the day", icon: "🌟", color: "#F59E0B" },
    ],
  },
];

export default function HabitTemplates({ onSuccess }) {
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState({}); // templateLabel -> true when done

  const handleAddTemplate = async (template) => {
    if (added[template.label]) return;
    const promises = template.habits.map((h, i) =>
      base44.entities.Habit.create({
        title: h.title,
        icon: h.icon,
        color: h.color,
        routine: template.routine,
        frequency: "daily",
        target_count: h.target_count || 1,
        is_active: true,
        order: i,
      })
    );
    await Promise.all(promises);
    setAdded((prev) => ({ ...prev, [template.label]: true }));
    onSuccess();
  };

  return (
    <div className="mb-4 rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-white/80 dark:bg-gray-800/80 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Quick-start templates
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="p-3 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TEMPLATES.map((template) => {
            const isDone = !!added[template.label];
            return (
              <div
                key={template.label}
                className="flex items-start justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                    {template.emoji} {template.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {template.habits.map((h) => h.icon).join(" ")} {template.habits.length} habits
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 capitalize">
                    {template.routine === "anytime" ? "Daily" : template.routine}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isDone ? "secondary" : "outline"}
                  className={`shrink-0 text-xs h-8 ${isDone ? "text-green-600 dark:text-green-400" : "border-purple-200 text-purple-700 hover:bg-purple-50"}`}
                  onClick={() => handleAddTemplate(template)}
                  disabled={isDone}
                >
                  {isDone ? (
                    <><Check className="w-3 h-3 mr-1" /> Added</>
                  ) : (
                    <><Plus className="w-3 h-3 mr-1" /> Add</>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}