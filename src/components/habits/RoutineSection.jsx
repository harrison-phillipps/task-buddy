import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Plus, Trash2, GripVertical, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const today = () => new Date().toISOString().split("T")[0];

export default function RoutineSection({ label, emoji, habits, completions, onAdd, onDelete, onComplete, onRefresh }) {
  const todayStr = today();

  const isCompleted = (habit) => {
    const c = completions.find(c => c.habit_id === habit.id && c.completion_date === todayStr);
    return !!c && (c.count || 0) >= (habit.target_count || 1);
  };

  const allDone = habits.length > 0 && habits.every(isCompleted);
  const doneCount = habits.filter(isCompleted).length;

  const handleComplete = async (habit) => {
    const existing = completions.find(c => c.habit_id === habit.id && c.completion_date === todayStr);
    if (existing) {
      await base44.entities.HabitCompletion.update(existing.id, { count: (existing.count || 1) + 1 });
    } else {
      await base44.entities.HabitCompletion.create({ habit_id: habit.id, completion_date: todayStr, count: 1 });
    }
    // Update streak on habit
    const newStreak = (habit.current_streak || 0) + 1;
    await base44.entities.Habit.update(habit.id, {
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, habit.longest_streak || 0),
      total_completions: (habit.total_completions || 0) + 1
    });
    onRefresh();
  };

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-purple-100 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className={`px-5 py-4 flex items-center justify-between ${allDone ? 'bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20' : 'bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20'}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{emoji}</span>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{label}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {doneCount}/{habits.length} done today
              {allDone && habits.length > 0 && <span className="ml-2 text-green-600 font-semibold">✓ All done!</span>}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onAdd} className="border-purple-200 text-purple-700 hover:bg-purple-50 gap-1">
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      {/* Progress bar */}
      {habits.length > 0 && (
        <div className="h-1.5 bg-gray-100 dark:bg-gray-700">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-teal-500 transition-all duration-500"
            style={{ width: `${(doneCount / habits.length) * 100}%` }}
          />
        </div>
      )}

      {/* Habits list */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {habits.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-gray-400">
            No habits yet — click <strong>Add</strong> to create one
          </div>
        )}
        <AnimatePresence>
          {habits.map(habit => {
            const done = isCompleted(habit);
            return (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={`flex items-center gap-3 px-5 py-3.5 group transition-colors ${done ? 'bg-green-50/50 dark:bg-green-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'}`}
              >
                <button
                  onClick={() => !done && handleComplete(habit)}
                  disabled={done}
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${done ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'}`}
                >
                  {done
                    ? <CheckCircle2 className="w-4 h-4 text-white" />
                    : <Circle className="w-4 h-4 text-transparent" />}
                </button>

                <span className="text-xl flex-shrink-0">{habit.icon || '📌'}</span>

                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm truncate ${done ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {habit.title}
                  </p>
                  {habit.current_streak > 1 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Flame className="w-3 h-3 text-orange-500" />
                      <span className="text-xs text-orange-500 font-semibold">{habit.current_streak} day streak</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onDelete(habit.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}