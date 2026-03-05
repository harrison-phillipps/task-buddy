import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Link as LinkIcon, ChevronDown, ChevronRight, CheckCircle2, Sparkles, RefreshCw, Pin } from "lucide-react";
import { toast } from "sonner";
import { analyzeTaskPriority } from "../components/ai/TaskPrioritizer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import TaskCard from "../components/TaskCard";
import SpreadTaskModal from "../components/dashboard/SpreadTaskModal";
import CalendarSyncModal from "../components/calendar/CalendarSyncModal";
import TaskDependencies from "../components/tasks/TaskDependencies";
import RecurringTaskModal from "../components/tasks/RecurringTaskModal";
import RecurringTaskBadge from "../components/tasks/RecurringTaskBadge";
import { processRecurringTasks } from "../components/tasks/RecurringTaskProcessor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TaskAssignment from "../components/team/TaskAssignment";
import CollaborativeTaskView from "../components/collaboration/CollaborativeTaskView";
import AutoScheduleFocusBlock from "../components/calendar/AutoScheduleFocusBlock";
import AIBreakdownModal from "../components/tasks/AIBreakdownModal";
import { enqueueOp, upsertCachedEntity, removeCachedEntity, cacheEntities, getCachedEntities } from "../components/offlineStore";
import { useOfflineSync } from "../components/useOfflineSync";
import OfflineIndicator from "../components/OfflineIndicator";
import { AIPriorityViewToggle, AIStrategyBanner, AIPriorityScoreBadge, PinButton, AIStrategySelector, STRATEGY_PROMPTS } from "../components/tasks/AIPriorityEngine";

export default function Tasks() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const teamIdParam = urlParams.get('teamId');
  
  const [filter, setFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [spreadTask, setSpreadTask] = useState(null);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedTaskTitle, setCompletedTaskTitle] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [selectedDependencyTask, setSelectedDependencyTask] = useState(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [selectedRecurringTask, setSelectedRecurringTask] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(teamIdParam || "personal");
  const [showCollabView, setShowCollabView] = useState(false);
  const [collabTask, setCollabTask] = useState(null);
  const [showScheduleFocus, setShowScheduleFocus] = useState(false);
  const [taskToSchedule, setTaskToSchedule] = useState(null);
  const [isAnalyzingPriority, setIsAnalyzingPriority] = useState(false);
  const [aiPrioritizedTasks, setAiPrioritizedTasks] = useState(null);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [aiStrategy, setAiStrategy] = useState("");
  const [aiRecommendedFocus, setAiRecommendedFocus] = useState("");
  const [showAIBreakdown, setShowAIBreakdown] = useState(false);
  const [taskToBreakdown, setTaskToBreakdown] = useState(null);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('tasks_view_mode') || "manual");
  const [aiStrategyKey, setAiStrategyKey] = useState(() => localStorage.getItem('tasks_ai_strategy') || "balanced");
  const [pinnedTaskIds, setPinnedTaskIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pinned_task_ids') || '[]'); } catch { return []; }
  });

  const { isOnline, pendingCount, isSyncing, flushQueue, refreshPendingCount } = useOfflineSync({
    onSyncComplete: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  // Persist view mode and strategy in localStorage + user profile
  const handleViewModeChange = async (mode) => {
    setViewMode(mode);
    localStorage.setItem('tasks_view_mode', mode);
    if (mode === "ai" && !aiPrioritizedTasks) {
      handleAIPrioritization();
    }
    if (currentUser) {
      base44.auth.updateMe({ tasks_view_mode: mode }).catch(() => {});
    }
  };

  const handleStrategyChange = async (key) => {
    setAiStrategyKey(key);
    localStorage.setItem('tasks_ai_strategy', key);
    if (currentUser) {
      base44.auth.updateMe({ tasks_ai_strategy: key }).catch(() => {});
    }
  };

  const handleTogglePin = (taskId) => {
    setPinnedTaskIds(prev => {
      const next = prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId];
      localStorage.setItem('pinned_task_ids', JSON.stringify(next));
      return next;
    });
  };

  // Listen for schedule focus events from TaskCard
  useEffect(() => {
    const handleScheduleFocus = (e) => {
      setTaskToSchedule(e.detail);
      setShowScheduleFocus(true);
    };
    window.addEventListener('scheduleFocusBlock', handleScheduleFocus);
    return () => window.removeEventListener('scheduleFocusBlock', handleScheduleFocus);
  }, []);

  // Load persisted view prefs from user profile on mount
  useEffect(() => {
    if (currentUser) {
      if (currentUser.tasks_view_mode) {
        setViewMode(currentUser.tasks_view_mode);
        localStorage.setItem('tasks_view_mode', currentUser.tasks_view_mode);
      }
      if (currentUser.tasks_ai_strategy) {
        setAiStrategyKey(currentUser.tasks_ai_strategy);
        localStorage.setItem('tasks_ai_strategy', currentUser.tasks_ai_strategy);
      }
    }
  }, [currentUser?.id]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        // Process recurring tasks on page load
        const lastCheck = localStorage.getItem('last_recurring_check');
        const today = new Date().toISOString().split('T')[0];
        if (lastCheck !== today) {
          processRecurringTasks(user.email).then(created => {
            if (created > 0) {
              queryClient.invalidateQueries({ queryKey: ['tasks'] });
            }
            localStorage.setItem('last_recurring_check', today);
          });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: rawTasks = [], isLoading } = useQuery({
    queryKey: ['tasks', currentUser?.email, selectedTeamId],
    queryFn: async () => {
      if (!currentUser) return [];

      // If offline, serve from IndexedDB cache
      if (!navigator.onLine) {
        const cached = await getCachedEntities('Task');
        if (selectedTeamId === 'personal') {
          return cached.filter(t =>
            (!t.team_id && t.created_by === currentUser.email) ||
            t.assigned_to === currentUser.id ||
            t.assigned_to_users?.some(u => u.user_id === currentUser.id)
          );
        }
        return cached.filter(t => t.team_id === selectedTeamId);
      }

      let fetched = [];
      if (selectedTeamId === "personal") {
        // Run both filters in parallel
        const [personalTasks, assignedTasks] = await Promise.all([
          base44.entities.Task.filter({ created_by: currentUser.email, team_id: null }, '-created_date'),
          base44.entities.Task.filter({ assigned_to: currentUser.id }, '-created_date'),
        ]);
        const seen = new Set();
        fetched = [...personalTasks, ...assignedTasks].filter(t => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
      } else {
        fetched = await base44.entities.Task.filter({ team_id: selectedTeamId }, '-created_date');
      }

      // Update cache
      if (fetched.length > 0) await cacheEntities('Task', fetched);
      return fetched;
    },
    enabled: !!currentUser,
    staleTime: isOnline ? 0 : Infinity,
  });

  // Merge AI scores into raw tasks if available
  const tasks = rawTasks.map(t => {
    const aiTask = aiPrioritizedTasks?.find(a => a.id === t.id);
    return aiTask ? { ...t, ...aiTask } : t;
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      const allTeams = await base44.entities.Team.list();
      return allTeams.filter(team => 
        team.owner_id === currentUser.id || team.member_ids?.includes(currentUser.id)
      );
    },
    enabled: !!currentUser,
  });

  const currentTeam = teams.find(t => t.id === selectedTeamId);
  
  const getTeamMembers = (task) => {
    const taskTeam = teams.find(t => t.id === task.team_id);
    if (!taskTeam) return [];
    
    const members = [];
    
    // Add owner
    if (taskTeam.owner_id) {
      members.push({
        id: taskTeam.owner_id,
        full_name: taskTeam.owner_name,
        email: taskTeam.owner_email
      });
    }
    
    // Add other members
    if (taskTeam.members) {
      taskTeam.members.forEach(member => {
        members.push({
          id: member.user_id,
          full_name: member.user_name,
          email: member.user_email
        });
      });
    }
    
    return members;
  };

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      if (!navigator.onLine) {
        await enqueueOp({ entity: 'Task', type: 'delete', id: taskId, data: null });
        await removeCachedEntity('Task', taskId);
        await refreshPendingCount();
        return;
      }
      await base44.entities.Task.delete(taskId);
      await removeCachedEntity('Task', taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      if (!navigator.onLine) {
        await enqueueOp({ entity: 'Task', type: 'update', id, data });
        await upsertCachedEntity('Task', id, { ...rawTasks.find(t => t.id === id), ...data, id });
        await refreshPendingCount();
        return { id, ...data };
      }
      const updated = await base44.entities.Task.update(id, data);
      await upsertCachedEntity('Task', id, updated);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['focusSessionTasks'] });
    },
  });

  const quickCompleteMutation = useMutation({
    mutationFn: async (task) => {
      const completedSubtasks = task.subtasks?.map(st => ({ ...st, completed: true })) || [];
      const updateData = { status: 'completed', subtasks: completedSubtasks };
      if (!navigator.onLine) {
        await enqueueOp({ entity: 'Task', type: 'update', id: task.id, data: updateData });
        await upsertCachedEntity('Task', task.id, { ...task, ...updateData });
        await refreshPendingCount();
        return task;
      }
      const updated = await base44.entities.Task.update(task.id, updateData);
      await upsertCachedEntity('Task', task.id, updated);
      return task;
    },
    onSuccess: (data, task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setCompletedTaskTitle(task.title);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    },
  });

  const handleSubtaskToggle = async (taskId, updatedSubtasks) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const allCompleted = updatedSubtasks.every(st => st.completed);
    const anyCompleted = updatedSubtasks.some(st => st.completed);
    
    let newStatus = task.status;
    if (allCompleted && task.status !== 'completed') {
      newStatus = 'completed';
      setCompletedTaskTitle(task.title);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    } else if (anyCompleted && task.status === 'not_started') {
      newStatus = 'in_progress';
    }

    await updateTaskMutation.mutateAsync({
      id: taskId,
      data: { subtasks: updatedSubtasks, status: newStatus }
    });
  };

  const handleAddDependency = async (blockerId) => {
    if (!selectedDependencyTask) return;
    
    const blockedBy = [...(selectedDependencyTask.blocked_by || [])];
    if (!blockedBy.includes(blockerId)) {
      blockedBy.push(blockerId);
      
      await updateTaskMutation.mutateAsync({
        id: selectedDependencyTask.id,
        data: { blocked_by: blockedBy }
      });
    }
    setShowDependencyModal(false);
  };

  const handleSetRecurring = async (recurringData) => {
    if (!selectedRecurringTask) return;

    await updateTaskMutation.mutateAsync({
      id: selectedRecurringTask.id,
      data: recurringData
    });
    setShowRecurringModal(false);
  };

  const handleQuickComplete = (task) => {
    quickCompleteMutation.mutate(task);
  };

  const handleChangePriority = (task, priority) => {
    updateTaskMutation.mutate({
      id: task.id,
      data: { task_priority: priority }
    });
    toast.success(`Task priority updated to ${priority.replace('_', ' ')}`);
  };

  const handleAIPrioritization = async () => {
    if (!currentUser) return;
    setIsAnalyzingPriority(true);
    try {
      const preferences = currentUser.ai_prioritization_preferences || {};
      const allUserTasks = await base44.entities.Task.filter({ created_by: currentUser.email }, '-updated_date', 200);
      const activeTasks = rawTasks.filter(t => t.status !== 'completed');
      const strategyHint = STRATEGY_PROMPTS[aiStrategyKey] || "";
      const result = await analyzeTaskPriority(activeTasks, allUserTasks, preferences, strategyHint);
      setAiPrioritizedTasks(result.tasks);
      setAiStrategy(result.strategy);
      setAiRecommendedFocus(result.recommended_focus);
      setShowAIInsights(true);
      toast.success("AI prioritization complete! ✨", { description: result.recommended_focus });
    } catch (error) {
      console.error("AI prioritization error:", error);
      toast.error("Failed to analyze priorities");
    }
    setIsAnalyzingPriority(false);
  };

  const filteredTasks = (() => {
    let result = tasks.filter(task => {
      if (task.is_recurring && !task.parent_recurring_task_id && !task.due_date) return false;
      let statusMatch = filter === "all" ? task.status !== 'completed' : task.status === filter;
      let priorityMatch = priorityFilter === "all" || task.task_priority === priorityFilter;
      return statusMatch && priorityMatch;
    });

    if (viewMode === "ai" && aiPrioritizedTasks) {
      result = [...result].sort((a, b) => {
        const aPinned = pinnedTaskIds.includes(a.id);
        const bPinned = pinnedTaskIds.includes(b.id);
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        return (b.ai_priority_score || 0) - (a.ai_priority_score || 0);
      });
    } else {
      result = [...result].sort((a, b) => {
        const aPinned = pinnedTaskIds.includes(a.id);
        const bPinned = pinnedTaskIds.includes(b.id);
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        return 0;
      });
    }
    return result;
  })();

  const statusCounts = {
    all: tasks.length,
    not_started: tasks.filter(t => t.status === "not_started").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
  };

  // Group tasks by category (only used in manual view)
  const groupedTasks = filteredTasks.reduce((acc, task) => {
    const category = task.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(task);
    return acc;
  }, {});

  const categoryLabels = {
    work: "💼 Work",
    personal: "🏠 Personal",
    health: "💪 Health",
    creative: "🎨 Creative",
    learning: "📚 Learning",
    household: "🧹 Household",
    other: "📋 Other"
  };

  const categoryColors = {
    work: "from-blue-100 to-blue-50 border-blue-200",
    personal: "from-purple-100 to-purple-50 border-purple-200",
    health: "from-green-100 to-green-50 border-green-200",
    creative: "from-pink-100 to-pink-50 border-pink-200",
    learning: "from-yellow-100 to-yellow-50 border-yellow-200",
    household: "from-orange-100 to-orange-50 border-orange-200",
    other: "from-gray-100 to-gray-50 border-gray-200"
  };

  // Trigger confetti when celebration shows
  useEffect(() => {
    if (showCelebration) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#14B8A6', '#FB7185', '#FCD34D']
      });
    }
  }, [showCelebration]);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <OfflineIndicator
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        onRetry={flushQueue}
      />
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-purple-500 to-teal-500 text-white px-8 py-4 rounded-2xl shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <div>
                <p className="font-bold text-lg">Task Completed!</p>
                <p className="text-sm text-purple-100">{completedTaskTitle}</p>
              </div>
              <span className="text-3xl">✨</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent mb-3 break-words">
              {selectedTeamId === "personal" ? "My Tasks" : currentTeam?.name || "Team Tasks"}
            </h1>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal Tasks</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <AIPriorityViewToggle
              viewMode={viewMode}
              onToggle={handleViewModeChange}
              isAnalyzing={isAnalyzingPriority}
              hasAIData={!!aiPrioritizedTasks}
              onRunAI={handleAIPrioritization}
            />
            {viewMode === "ai" && (
              <AIStrategySelector value={aiStrategyKey} onChange={handleStrategyChange} />
            )}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="must_do">🔴 Must Do</SelectItem>
                <SelectItem value="should_do">🟡 Should Do</SelectItem>
                <SelectItem value="could_do">🟢 Could Do</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline"
              onClick={() => setShowCalendarSync(true)}
              className="border-purple-200 hover:bg-purple-50 flex-1 sm:flex-none"
            >
              <Calendar className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Sync to Calendar</span>
              <span className="sm:hidden">Sync</span>
            </Button>
            <Link to={createPageUrl("TaskBreakdown")} className="flex-1 sm:flex-none">
              <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold shadow-lg w-full">
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </Link>
          </div>
        </motion.div>

        {showAIInsights && viewMode === "ai" && (
          <AIStrategyBanner
            strategy={aiStrategy}
            recommendedFocus={aiRecommendedFocus}
            onDismiss={() => setShowAIInsights(false)}
          />
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-white/80 backdrop-blur-sm border border-purple-100 w-full grid grid-cols-2 sm:grid-cols-4 h-auto">
              <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-teal-500 data-[state=active]:text-white text-xs sm:text-sm">
                All ({statusCounts.all})
              </TabsTrigger>
              <TabsTrigger value="not_started" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Not Started</span>
                <span className="sm:hidden">Not Started</span> ({statusCounts.not_started})
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">In Progress</span>
                <span className="sm:hidden">In Progress</span> ({statusCounts.in_progress})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs sm:text-sm">
                Completed ({statusCounts.completed})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading your tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-32 h-32 bg-gradient-to-br from-purple-200 to-teal-200 rounded-full mx-auto mb-6 flex items-center justify-center text-6xl">
              {filter === "completed" ? "🎉" : "📝"}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {filter === "completed" ? "No completed tasks yet" : "No tasks here"}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === "all" 
                ? "Get started by breaking down your first task!"
                : `You don't have any ${filter.replace('_', ' ')} tasks`}
            </p>
            {filter === "all" && (
              <Link to={createPageUrl("TaskBreakdown")}>
                <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold px-8 py-6 text-lg shadow-lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Task
                </Button>
              </Link>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {viewMode === "ai" ? (
              // AI VIEW: flat sorted list with priority scores
              <div className="space-y-3">
                {filteredTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="relative"
                  >
                    <div className="flex items-start gap-2">
                      {/* Rank number */}
                      <div className="flex-shrink-0 w-7 h-7 mt-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <PinButton isPinned={pinnedTaskIds.includes(task.id)} onToggle={() => handleTogglePin(task.id)} />
                          <AIPriorityScoreBadge task={task} showRationale />
                          {pinnedTaskIds.includes(task.id) && (
                            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">📌 Pinned</span>
                          )}
                        </div>
                        <TaskCard
                          task={task}
                          allTasks={tasks}
                          showTeamInfo={selectedTeamId !== "personal" || !!task.team_id}
                          onStart={(task) => window.location.href = createPageUrl("FocusSession") + `?taskId=${task.id}`}
                          onEdit={(task, action) => {
                            if (action === 'ai-breakdown') {
                              setTaskToBreakdown(task);
                              setShowAIBreakdown(true);
                            } else {
                              window.location.href = createPageUrl("TaskBreakdown") + `?editTaskId=${task.id}`;
                            }
                          }}
                          onDelete={(task) => { if (confirm(`Delete "${task.title}"?`)) deleteTaskMutation.mutate(task.id); }}
                          onSpread={(task) => setSpreadTask(task)}
                          onSubtaskToggle={handleSubtaskToggle}
                          onSetDependency={(task) => { setSelectedDependencyTask(task); setShowDependencyModal(true); }}
                          onSetRecurring={(task) => { setSelectedRecurringTask(task); setShowRecurringModal(true); }}
                          onOpenCollabView={(task) => { setCollabTask(task); setShowCollabView(true); }}
                          onQuickComplete={handleQuickComplete}
                          onChangePriority={handleChangePriority}
                        />
                        {task.team_id && (
                          <div className="ml-4 mt-2">
                            <TaskAssignment task={task} teamMembers={getTeamMembers(task)}
                              onAssign={(data) => updateTaskMutation.mutate({ id: task.id, data })}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              // MANUAL VIEW: category-grouped accordion
              <Accordion type="multiple" defaultValue={Object.keys(groupedTasks)} className="space-y-4">
                {Object.entries(groupedTasks).map(([category, categoryTasks]) => (
                  <AccordionItem 
                    key={category} 
                    value={category}
                    className={`bg-gradient-to-br ${categoryColors[category]} border rounded-lg overflow-hidden`}
                  >
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="text-lg font-semibold text-gray-800">
                          {categoryLabels[category] || category}
                        </span>
                        <span className="text-sm font-medium text-gray-600 bg-white px-3 py-1 rounded-full">
                          {categoryTasks.length} {categoryTasks.length === 1 ? 'task' : 'tasks'}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                        {categoryTasks.map((task, index) => (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            <div className="space-y-3">
                              {pinnedTaskIds.includes(task.id) && (
                                <div className="flex items-center gap-1 text-xs text-purple-600 font-medium ml-1">
                                  <Pin className="w-3 h-3" />
                                  Pinned
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 mb-1">
                                <PinButton isPinned={pinnedTaskIds.includes(task.id)} onToggle={() => handleTogglePin(task.id)} />
                              </div>
                              <TaskCard
                                task={task}
                                allTasks={tasks}
                                showTeamInfo={selectedTeamId !== "personal" || !!task.team_id}
                                onStart={(task) => window.location.href = createPageUrl("FocusSession") + `?taskId=${task.id}`}
                                onEdit={(task, action) => {
                                  if (action === 'ai-breakdown') {
                                    setTaskToBreakdown(task);
                                    setShowAIBreakdown(true);
                                  } else {
                                    window.location.href = createPageUrl("TaskBreakdown") + `?editTaskId=${task.id}`;
                                  }
                                }}
                                onDelete={(task) => {
                                  if (confirm(`Delete "${task.title}"?`)) {
                                    deleteTaskMutation.mutate(task.id);
                                  }
                                }}
                                onSpread={(task) => setSpreadTask(task)}
                                onSubtaskToggle={handleSubtaskToggle}
                                onSetDependency={(task) => {
                                  setSelectedDependencyTask(task);
                                  setShowDependencyModal(true);
                                }}
                                onSetRecurring={(task) => {
                                  setSelectedRecurringTask(task);
                                  setShowRecurringModal(true);
                                }}
                                onOpenCollabView={(task) => {
                                  setCollabTask(task);
                                  setShowCollabView(true);
                                }}
                                onQuickComplete={handleQuickComplete}
                                onChangePriority={handleChangePriority}
                              />
                              {task.team_id && (
                                <div className="ml-4">
                                  <TaskAssignment
                                    task={task}
                                    teamMembers={getTeamMembers(task)}
                                    onAssign={(data) => {
                                      updateTaskMutation.mutate({ id: task.id, data }, {
                                        onSuccess: async () => {
                                          if (data.assigned_to || data.assigned_to_users?.length > 0) {
                                            try {
                                              await base44.entities.TeamNotification.create({
                                                team_id: task.team_id,
                                                type: "task_assigned",
                                                title: `Task assigned: "${task.title}"`,
                                                message: data.assigned_to_users?.length > 1 
                                                  ? `Task assigned to ${data.assigned_to_users.length} team members`
                                                  : `Task assigned to ${data.assigned_to_name}`,
                                                priority: "medium",
                                                related_id: task.id,
                                                created_by: currentUser?.id
                                              });
                                              queryClient.invalidateQueries({ queryKey: ['teamNotifications'] });
                                            } catch (error) {
                                              console.error("Error creating notification:", error);
                                            }
                                          }
                                        }
                                      });
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </motion.div>
        )}

        <SpreadTaskModal
          task={spreadTask}
          open={!!spreadTask}
          onClose={() => setSpreadTask(null)}
          onSave={(updatedTask) => {
            updateTaskMutation.mutate({
              id: updatedTask.id,
              data: {
                subtasks: updatedTask.subtasks,
                spread_across_days: updatedTask.spread_across_days,
                daily_time_limit: updatedTask.daily_time_limit
              }
            });
          }}
        />

        <CalendarSyncModal
          open={showCalendarSync}
          onOpenChange={setShowCalendarSync}
          tasks={tasks}
          currentUser={currentUser}
          onSyncComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
          }}
        />

        <Dialog open={showDependencyModal} onOpenChange={setShowDependencyModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-purple-600" />
                Add Task Dependency
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">
                Select a task that must be completed before "{selectedDependencyTask?.title}"
              </p>
              <div className="space-y-2">
                <Label>Blocking Task</Label>
                <Select onValueChange={handleAddDependency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a task" />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks
                      .filter(t => 
                        t.id !== selectedDependencyTask?.id && 
                        !selectedDependencyTask?.blocked_by?.includes(t.id)
                      )
                      .map(task => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedDependencyTask && (
                <TaskDependencies
                  task={selectedDependencyTask}
                  allTasks={tasks}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        <RecurringTaskModal
          open={showRecurringModal}
          onOpenChange={setShowRecurringModal}
          initialTask={selectedRecurringTask}
          onSave={handleSetRecurring}
        />

        <CollaborativeTaskView
          task={collabTask}
          open={showCollabView}
          onOpenChange={setShowCollabView}
          currentUser={currentUser}
        />

        <AutoScheduleFocusBlock
          open={showScheduleFocus}
          onOpenChange={setShowScheduleFocus}
          task={taskToSchedule}
          onScheduled={() => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
          }}
        />

        <AIBreakdownModal
          task={taskToBreakdown}
          open={showAIBreakdown}
          onOpenChange={setShowAIBreakdown}
          onSave={(data) => {
            if (taskToBreakdown) {
              updateTaskMutation.mutate({
                id: taskToBreakdown.id,
                data: data
              });
              setShowAIBreakdown(false);
              setTaskToBreakdown(null);
              toast.success("Subtasks added to task!");
            }
          }}
        />
      </div>
    </div>
  );
}