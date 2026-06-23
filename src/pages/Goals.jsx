import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Plus, RefreshCw } from "lucide-react";
import GoogleTasksSyncButton from "../components/goals/GoogleTasksSyncButton";
import { motion } from "framer-motion";
import GoalCard from "../components/goals/GoalCard";
import CreateGoalModal from "../components/goals/CreateGoalModal";
import GoalBreakdownModal from "../components/goals/GoalBreakdownModal";
import CalendarSyncModal from "../components/calendar/CalendarSyncModal";
import GoalCoach from "../components/ai/GoalCoach";
import PullToRefresh from "../components/PullToRefresh";
import WeeklyGoalsPanel from "../components/goals/WeeklyGoalsPanel";
import { hasFeatureAccess, UpgradePrompt } from "@/components/subscription/FeatureGate";

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [filter, setFilter] = useState("all");
  const userTier = currentUser?.subscription_tier || "free";
  const hasWeeklyGoals = hasFeatureAccess(userTier, "weekly_goals");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [breakdownGoal, setBreakdownGoal] = useState(null);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const [selectedGoalForCoaching, setSelectedGoalForCoaching] = useState(null);
  const [userProgress, setUserProgress] = useState(null);

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

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const [ownGoals, clinicianGoals] = await Promise.all([
        base44.entities.Goal.filter({ created_by: currentUser.email }, '-created_date'),
        base44.entities.Goal.filter({ client_user_id: currentUser.id, added_by_clinician: true }, '-created_date'),
      ]);
      const seen = new Set();
      return [...ownGoals, ...clinicianGoals].filter(g => {
        if (seen.has(g.id)) return false;
        seen.add(g.id);
        return true;
      });
    },
    enabled: !!currentUser,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', currentUser?.email],
    queryFn: () => currentUser ? base44.entities.Task.filter({ created_by: currentUser.email }) : [],
    enabled: !!currentUser,
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (goalId) => base44.entities.Goal.delete(goalId),
    onMutate: async (goalId) => {
      await queryClient.cancelQueries({ queryKey: ['goals'] });
      const previous = queryClient.getQueryData(['goals', currentUser?.email]);
      queryClient.setQueryData(['goals', currentUser?.email], (old = []) =>
        old.filter(g => g.id !== goalId)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['goals', currentUser?.email], ctx.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Goal.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['goals'] });
      const previous = queryClient.getQueryData(['goals', currentUser?.email]);
      queryClient.setQueryData(['goals', currentUser?.email], (old = []) =>
        old.map(g => g.id === id ? { ...g, ...data } : g)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['goals', currentUser?.email], ctx.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const filteredGoals = goals.filter(goal => {
    if (filter === "all") return true;
    return goal.status === filter;
  });

  const statusCounts = {
    all: goals.length,
    not_started: goals.filter(g => g.status === "not_started").length,
    in_progress: goals.filter(g => g.status === "in_progress").length,
    at_risk: goals.filter(g => g.status === "at_risk").length,
    completed: goals.filter(g => g.status === "completed").length,
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['goals'] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
              Goals & Objectives
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Define big goals and track your progress</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <GoogleTasksSyncButton goals={goals} />
            <Button 
              onClick={() => setShowCalendarSync(true)}
              variant="outline"
              className="border-purple-200"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync to Calendar
            </Button>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Goal
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-purple-100 dark:border-gray-700">
              <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
              <TabsTrigger value="not_started">Not Started ({statusCounts.not_started})</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress ({statusCounts.in_progress})</TabsTrigger>
              <TabsTrigger value="at_risk">At Risk ({statusCounts.at_risk})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({statusCounts.completed})</TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading your goals...</p>
          </div>
        ) : filteredGoals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-32 h-32 bg-gradient-to-br from-purple-200 to-teal-200 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Target className="w-16 h-16 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">No goals yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {filter === "all" 
                ? "Start by defining your first big objective!"
                : `You don't have any ${filter.replace('_', ' ')} goals`}
            </p>
            {filter === "all" && (
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold px-8 py-6 text-lg shadow-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Goal
              </Button>
            )}
          </motion.div>
        ) : (
          <>
            {selectedGoalForCoaching && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-6"
              >
                <GoalCoach 
                  goal={selectedGoalForCoaching}
                  tasks={tasks}
                  userProgress={userProgress}
                />
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {filteredGoals.map((goal, index) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GoalCard
                    goal={goal}
                    tasks={tasks.filter(t => t.goal_id === goal.id)}
                    onUpdate={(data) => updateGoalMutation.mutate({ id: goal.id, data })}
                    onDelete={() => {
                      if (confirm(`Delete "${goal.title}"?`)) {
                        deleteGoalMutation.mutate(goal.id);
                      }
                    }}
                    onBreakdown={() => setBreakdownGoal(goal)}
                    onCoach={() => setSelectedGoalForCoaching(goal)}
                    isCoaching={selectedGoalForCoaching?.id === goal.id}
                  />
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        {/* Weekly Goals — Pro+ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          {hasWeeklyGoals
            ? <WeeklyGoalsPanel />
            : <UpgradePrompt feature="Recurring Weekly Goals" requiredTier="pro" />
          }
        </motion.div>

        <CreateGoalModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            setShowCreateModal(false);
          }}
        />

        <GoalBreakdownModal
          goal={breakdownGoal}
          open={!!breakdownGoal}
          onClose={() => setBreakdownGoal(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setBreakdownGoal(null);
          }}
        />

        <CalendarSyncModal
          open={showCalendarSync}
          onOpenChange={setShowCalendarSync}
          tasks={[]}
          goals={goals}
          currentUser={currentUser}
          onSyncComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
          }}
        />
      </div>
    </div>
    </PullToRefresh>
  );
}