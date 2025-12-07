import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import HabitCard from "../components/habits/HabitCard";
import CreateHabitModal from "../components/habits/CreateHabitModal";
import HabitStatsCard from "../components/habits/HabitStatsCard";
import VirtualCompanion from "../components/VirtualCompanion";
import { getPersonalizedMessage } from "@/components/companionUtils";
import { POINTS_SYSTEM } from "@/components/achievementsData";
import AICoachPanel from "../components/habits/AICoachPanel";
import HabitInsights from "../components/habits/HabitInsights";

export default function HabitsPage() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [filter, setFilter] = useState("active");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [insightsHabit, setInsightsHabit] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        const progressList = await base44.entities.UserProgress.filter({ user_id: user.id });
        if (progressList.length > 0) {
          setUserProgress(progressList[0]);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: habits = [], isLoading } = useQuery({
    queryKey: ['habits', currentUser?.email],
    queryFn: () => currentUser ? base44.entities.Habit.filter({ created_by: currentUser.email }, '-created_date') : [],
    enabled: !!currentUser,
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['habitCompletions', currentUser?.email],
    queryFn: () => currentUser ? base44.entities.HabitCompletion.filter({ created_by: currentUser.email }) : [],
    enabled: !!currentUser,
  });

  const completeHabitMutation = useMutation({
    mutationFn: async ({ habit, date }) => {
      const dateStr = date || new Date().toISOString().split('T')[0];
      
      // Check if already completed today
      const existing = completions.find(c => 
        c.habit_id === habit.id && 
        c.completion_date === dateStr
      );

      if (existing) {
        // Increment count
        await base44.entities.HabitCompletion.update(existing.id, {
          count: existing.count + 1
        });
      } else {
        // Create new completion
        await base44.entities.HabitCompletion.create({
          habit_id: habit.id,
          completion_date: dateStr,
          count: 1
        });
      }

      // Update habit stats
      const newStreak = calculateStreak(habit, [...completions, { habit_id: habit.id, completion_date: dateStr }]);
      await base44.entities.Habit.update(habit.id, {
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, habit.longest_streak || 0),
        total_completions: (habit.total_completions || 0) + 1,
        last_completed_date: dateStr
      });

      // Award points
      if (currentUser) {
        const progressList = await base44.entities.UserProgress.filter({ user_id: currentUser.id });
        if (progressList.length > 0) {
          const progress = progressList[0];
          const points = POINTS_SYSTEM.HABIT_COMPLETED + (newStreak > 1 ? POINTS_SYSTEM.STREAK_BONUS : 0);
          await base44.entities.UserProgress.update(progress.id, {
            total_points: progress.total_points + points,
            last_activity_date: new Date().toISOString()
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habitCompletions'] });
      queryClient.invalidateQueries({ queryKey: ['userProgress'] });
    },
  });

  const updateHabitMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Habit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  const deleteHabitMutation = useMutation({
    mutationFn: (habitId) => base44.entities.Habit.delete(habitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  const calculateStreak = (habit, allCompletions) => {
    const habitCompletions = allCompletions
      .filter(c => c.habit_id === habit.id)
      .sort((a, b) => new Date(b.completion_date) - new Date(a.completion_date));

    if (habitCompletions.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const completed = habitCompletions.some(c => c.completion_date === dateStr);
      
      if (completed) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (i === 0) {
        // Allow today to not be completed yet
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  const filteredHabits = habits.filter(habit => {
    if (filter === "active") return habit.is_active;
    if (filter === "inactive") return !habit.is_active;
    return true;
  });

  const totalActiveHabits = habits.filter(h => h.is_active).length;
  const completedToday = habits.filter(h => {
    const today = new Date().toISOString().split('T')[0];
    return completions.some(c => c.habit_id === h.id && c.completion_date === today);
  }).length;
  const totalStreaks = habits.reduce((sum, h) => sum + (h.current_streak || 0), 0);

  const getCompanionMessage = () => {
    if (completedToday === 0 && totalActiveHabits > 0) {
      return `Good morning! You have ${totalActiveHabits} habit${totalActiveHabits > 1 ? 's' : ''} to complete today. Let's start strong! 💪`;
    }
    if (completedToday === totalActiveHabits && totalActiveHabits > 0) {
      return `Incredible! All ${totalActiveHabits} habits completed today! You're on fire! 🔥🎉`;
    }
    if (completedToday > 0) {
      return `Great progress! ${completedToday}/${totalActiveHabits} habits done. Keep the momentum going! ⚡`;
    }
    return getPersonalizedMessage(userProgress, "dashboard", currentUser);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
              Habit Tracker
            </h1>
            <p className="text-gray-600 mt-1">Build consistency, one day at a time</p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Habit
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <VirtualCompanion
            mood={completedToday === totalActiveHabits && totalActiveHabits > 0 ? "celebrating" : "supportive"}
            message={getCompanionMessage()}
            size="small"
            characterType={currentUser?.companion_type || "human"}
            userProgress={userProgress}
          />
        </motion.div>

        <HabitStatsCard
          totalActiveHabits={totalActiveHabits}
          completedToday={completedToday}
          totalStreaks={totalStreaks}
          habits={habits}
          completions={completions}
        />

        <AICoachPanel
          habits={habits}
          userProgress={userProgress}
          personality={currentUser?.companion_personality_custom || {}}
          onRecommendationSelect={(rec) => {
            setShowCreateModal(true);
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-white/80 backdrop-blur-sm border border-purple-100">
              <TabsTrigger value="active">Active ({habits.filter(h => h.is_active).length})</TabsTrigger>
              <TabsTrigger value="inactive">Inactive ({habits.filter(h => !h.is_active).length})</TabsTrigger>
              <TabsTrigger value="all">All ({habits.length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading your habits...</p>
          </div>
        ) : filteredHabits.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-32 h-32 bg-gradient-to-br from-purple-200 to-teal-200 rounded-full mx-auto mb-6 flex items-center justify-center">
              <TrendingUp className="w-16 h-16 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No habits yet</h3>
            <p className="text-gray-600 mb-6">
              {filter === "active" 
                ? "Start building better habits today!"
                : `You don't have any ${filter} habits`}
            </p>
            {filter === "active" && (
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold px-8 py-6 text-lg shadow-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Habit
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredHabits.map((habit, index) => (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <HabitCard
                  habit={habit}
                  completions={completions.filter(c => c.habit_id === habit.id)}
                  onComplete={(date) => completeHabitMutation.mutate({ habit, date })}
                  onUpdate={(data) => updateHabitMutation.mutate({ id: habit.id, data })}
                  onDelete={() => {
                    if (confirm(`Delete "${habit.title}"?`)) {
                      deleteHabitMutation.mutate(habit.id);
                    }
                  }}
                  onViewInsights={() => setInsightsHabit(habit)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        <CreateHabitModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['habits'] });
            setShowCreateModal(false);
          }}
        />

        <HabitInsights
          open={!!insightsHabit}
          onOpenChange={(open) => !open && setInsightsHabit(null)}
          habit={insightsHabit}
          completions={completions.filter(c => c.habit_id === insightsHabit?.id)}
          userProgress={userProgress}
          personality={currentUser?.companion_personality_custom || {}}
        />
      </div>
    </div>
  );
}