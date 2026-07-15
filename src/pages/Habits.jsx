import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, Sun, Moon, Zap, Trophy } from "lucide-react";
import { hasFeatureAccess, UpgradePrompt } from "@/components/subscription/FeatureGate";
import RoutineSection from "../components/habits/RoutineSection";
import AddHabitSheet from "../components/habits/AddHabitSheet";
import WinsJournal from "../components/habits/WinsJournal";
import HabitTemplates from "../components/habits/HabitTemplates";

const TODAY = new Date().toLocaleDateString('en-CA');

const ROUTINES = [
  { key: "morning", label: "Morning Routine", emoji: "🌅" },
  { key: "anytime", label: "Daily Habits",    emoji: "⚡" },
  { key: "evening", label: "Evening Routine", emoji: "🌙" },
];

export default function Habits() {
  const [addRoutine, setAddRoutine] = useState(null); // which routine is being added to
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  const userTier = currentUser?.subscription_tier || "free";
  const hasHabitAccess = hasFeatureAccess(userTier, "habit_tracking");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: habits = [] } = useQuery({
    queryKey: ["habits"],
    queryFn: () => base44.entities.Habit.list("-order"),
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["habit-completions"],
    queryFn: () => base44.entities.HabitCompletion.filter({ completion_date: TODAY }),
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["habits"] });
    queryClient.invalidateQueries({ queryKey: ["habit-completions"] });
  }, [queryClient]);

  const handleDelete = async (habitId) => {
    await base44.entities.Habit.delete(habitId);
    refresh();
  };

  // Summary stats
  const activeHabits = habits.filter(h => h.is_active);
  const completedToday = activeHabits.filter(h =>
    completions.find(c => c.habit_id === h.id && (c.count || 1) >= (h.target_count || 1))
  ).length;
  const totalToday = activeHabits.length;
  const bestStreak = activeHabits.reduce((max, h) => Math.max(max, h.current_streak || 0), 0);

  if (!hasHabitAccess) {
    return (
      <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" />
            Habits & Routines
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Build consistent daily routines</p>
        </div>
        <UpgradePrompt feature="Habit and Routine Tracking" requiredTier="pro" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Flame className="w-6 h-6 text-orange-500" />
          Habits & Routines
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Build consistent daily routines</p>
      </div>

      {/* Today's summary */}
      {totalToday > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-500 to-teal-500 rounded-2xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Today's Progress</p>
              <p className="text-3xl font-bold mt-0.5">{completedToday} / {totalToday}</p>
              <p className="text-sm opacity-80 mt-0.5">habits completed</p>
            </div>
            <div className="text-right space-y-2">
              {bestStreak > 0 && (
                <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                  <Flame className="w-4 h-4" />
                  <span className="text-sm font-semibold">{bestStreak}d streak</span>
                </div>
              )}
              {completedToday === totalToday && totalToday > 0 && (
                <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm font-semibold">All done! 🎉</span>
                </div>
              )}
            </div>
          </div>
          {/* progress bar */}
          <div className="mt-3 h-2 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: totalToday > 0 ? `${(completedToday / totalToday) * 100}%` : '0%' }}
            />
          </div>
        </div>
      )}

      {/* Quick-start templates */}
      <HabitTemplates onSuccess={refresh} />

      {/* Routine sections */}
      <div className="space-y-4">
        {ROUTINES.map(routine => {
          const routineHabits = activeHabits
            .filter(h => h.routine === routine.key)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          return (
            <RoutineSection
              key={routine.key}
              label={routine.label}
              emoji={routine.emoji}
              habits={routineHabits}
              completions={completions}
              userTier={userTier}
              onAdd={() => setAddRoutine(routine.key)}
              onDelete={handleDelete}
              onRefresh={refresh}
            />
          );
        })}
      </div>

      {/* Wins Journal */}
      <div className="mt-4">
        <WinsJournal />
      </div>

      {/* Add habit sheet */}
      <AddHabitSheet
        open={!!addRoutine}
        onOpenChange={(o) => !o && setAddRoutine(null)}
        routine={addRoutine}
        onSuccess={refresh}
      />
    </div>
  );
}