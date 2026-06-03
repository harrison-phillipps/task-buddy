import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "../components/PullToRefresh";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles } from "lucide-react";
import VirtualCompanion from "../components/VirtualCompanion";
import { motion } from "framer-motion";
import { getPersonalizedMessage } from "@/components/companionUtils";
import QuickAddTask from "../components/dashboard/QuickAddTask";
import OnboardingTour from "../components/onboarding/OnboardingTour";
import ProactiveCoach from "../components/ai/ProactiveCoach";
import SmartTaskRecommender from "../components/ai/SmartTaskRecommender";
import EnergyTaskSuggester from "../components/dashboard/EnergyTaskSuggester";
import { hasFeatureAccess } from "../components/subscription/FeatureGate";
import QuickStartFocus from "../components/dashboard/QuickStartFocus";

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [userProgress, setUserProgress] = useState(null);


  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', currentUser?.email],
    queryFn: () => base44.entities.Task.filter({ created_by: currentUser.email }, '-created_date'),
    enabled: !!currentUser,
    staleTime: 60_000, // 1 min — avoids redundant refetches
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', currentUser?.email],
    queryFn: () => base44.entities.FocusSession.filter({ created_by: currentUser.email }, '-created_date', 10),
    enabled: !!currentUser,
    staleTime: 60_000,
  });



  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        if (!user.display_name) { navigate(createPageUrl("Onboarding")); return; }
        if (!user.companion_type) { navigate(createPageUrl("CharacterSelection")); return; }
        
        const progressList = await base44.entities.UserProgress.filter({ user_id: user.id });

        if (progressList.length > 0) {
          setUserProgress(progressList[0]);
        } else {
          const newProgress = await base44.entities.UserProgress.create({
            user_id: user.id, total_points: 0, level: 1,
            tasks_completed: 0, focus_sessions_completed: 0,
            total_focus_minutes: 0, brain_dumps_created: 0,
            current_streak: 0, longest_streak: 0
          });
          setUserProgress(newProgress);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setCurrentUser({ id: 'error', email: 'error@example.com' });
      }
    };
    checkUser();
  }, [navigate]);

  const completedToday = tasks.filter(t => {
    if (t.status !== 'completed') return false;
    const today = new Date().toDateString();
    return new Date(t.updated_date).toDateString() === today;
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const currentLevel = userProgress ? Math.floor(userProgress.total_points / 200) + 1 : 1;

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  const getCompanionMessageClean = () => {
    if (userProgress?.tasks_completed > 0 || sessions.length > 0) {
      return getPersonalizedMessage(userProgress, "dashboard", currentUser);
    }
    return "Your first session is the hardest one. Everything after that is just momentum.";
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen p-2 sm:p-4 md:p-8 overflow-x-hidden w-full">
      <OnboardingTour currentUser={currentUser} />

      <div className="max-w-2xl mx-auto space-y-5 w-full px-2 sm:px-0">

        {/* ── 1. HERO HEADER ─────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="pt-4 pb-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {getGreeting()}, {currentUser.display_name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">What's been sitting on your list?</p>
        </motion.div>

        {/* ── 2. COMPANION + LEVEL BADGE (greeting) ──────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          {currentUser.companion_type && (
            <VirtualCompanion
              mood={completedToday.length > 0 ? "celebrating" : "supportive"}
              message={getCompanionMessageClean()}
              characterType={currentUser.companion_type}
              userProgress={userProgress}
              context="dashboard"
            />
          )}
          {userProgress && (
            <div className="mt-3 flex items-center gap-3 px-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/40 dark:to-orange-900/40 rounded-full border border-yellow-300 dark:border-yellow-700 text-sm">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="font-bold text-gray-900 dark:text-gray-100">Level {currentLevel}</span>
                {userProgress.current_streak > 0 && (
                  <>
                    <span className="text-gray-400">·</span>
                    <span className="text-orange-600 dark:text-orange-400 font-semibold">{userProgress.current_streak} 🔥</span>
                  </>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* ── 3. QUICK START ─────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <QuickStartFocus tasks={tasks} />
          {tasks.filter(t => t.status !== 'completed').length === 0 && (
            <QuickAddTask currentUser={currentUser} />
          )}
        </motion.div>

        {/* ── 4. WHAT SHOULD I WORK ON (energy matcher) ──────── */}
        {tasks.filter(t => t.status !== 'completed').length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <EnergyTaskSuggester tasks={tasks} />
          </motion.div>
        )}

        {/* ── 5. BEST NEXT TASK (AI) — Pro+ ──────────────────── */}
        {hasFeatureAccess(currentUser?.subscription_tier, "smart_recommendations") && tasks.filter(t => t.status !== 'completed').length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <SmartTaskRecommender
              tasks={tasks.filter(t => t.status !== 'completed')}
              userProgress={userProgress}
              currentUser={currentUser}
            />
          </motion.div>
        )}

        {/* ── 6. PERSONALISED INSIGHT — Pro+ ─────────────────── */}
        {hasFeatureAccess(currentUser?.subscription_tier, "proactive_coaching") && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="pb-6">
            <ProactiveCoach
              userProgress={userProgress}
              recentTasks={tasks}
              recentSessions={sessions}
              goals={[]}
              context="dashboard"
              userTier={currentUser?.subscription_tier || "free"}
            />
          </motion.div>
        )}

      </div>
    </div>

    </PullToRefresh>
        );
        }