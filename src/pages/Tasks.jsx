import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Link as LinkIcon, CheckCircle2, Sparkles, RefreshCw, Pin, UserPlus, BookTemplate, Trash2, CheckSquare, Square, X, Tag, Zap } from "lucide-react";
import TaskFilterSortBar from "../components/tasks/TaskFilterSortBar";
import toast from "react-hot-toast";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import MobileSelect from "@/components/MobileSelect";
import TaskAssignment from "../components/team/TaskAssignment";
import CollaborativeTaskView from "../components/collaboration/CollaborativeTaskView";
import AutoScheduleFocusBlock from "../components/calendar/AutoScheduleFocusBlock";
import AIBreakdownModal from "../components/tasks/AIBreakdownModal";
import { enqueueOp, upsertCachedEntity, removeCachedEntity, cacheEntities, getCachedEntities } from "../components/offlineStore";
import { useOfflineSync } from "../components/useOfflineSync";
import OfflineIndicator from "../components/OfflineIndicator";
import { AIPriorityViewToggle, AIStrategyBanner, AIPriorityScoreBadge, PinButton, AIStrategySelector, STRATEGY_PROMPTS } from "../components/tasks/AIPriorityEngine";
import PullToRefresh from "../components/PullToRefresh";
import SharedTaskListInviteModal from "../components/collaboration/SharedTaskListInviteModal";
import TeamMemberAvatars from "../components/collaboration/TeamMemberAvatars";
import AssignWithNotification from "../components/collaboration/AssignWithNotification";
import RoutineTemplatesModal from "../components/tasks/RoutineTemplatesModal";

export default function Tasks() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const teamIdParam = urlParams.get('teamId');
  
  const [filter, setFilter] = useState("all");
  const [taskFilters, setTaskFilters] = useState({ difficulty: "all", category: "all", priority: "all" });
  const [taskSort, setTaskSort] = useState("default");
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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoutineTemplates, setShowRoutineTemplates] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(null); // 'category' | 'difficulty' | null

  const isSelecting = selectedTaskIds.size > 0;

  const toggleSelectTask = (taskId) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  };

  const clearSelection = () => { setSelectedTaskIds(new Set()); setBulkEditMode(null); };

  const handleBulkComplete = async () => {
    const tasksToComplete = filteredTasks.filter(t => selectedTaskIds.has(t.id) && t.status !== 'completed');
    await Promise.all(tasksToComplete.map(t => quickCompleteMutation.mutateAsync(t)));
    clearSelection();
    toast.success(`${tasksToComplete.length} task${tasksToComplete.length !== 1 ? 's' : ''} completed! 🎉`);
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedTaskIds];
    await Promise.all(ids.map(id => deleteTaskMutation.mutateAsync(id)));
    clearSelection();
    setShowBulkDeleteConfirm(false);
    toast.success(`${ids.length} task${ids.length !== 1 ? 's' : ''} deleted`);
  };

  const handleBulkUpdate = async (field, value) => {
    const ids = [...selectedTaskIds];
    await Promise.all(ids.map(id => updateTaskMutation.mutateAsync({ id, data: { [field]: value } })));
    clearSelection();
    toast.success(`${ids.length} task${ids.length !== 1 ? 's' : ''} updated`);
  };

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
          return cached.filter(t => !t.team_id && t.created_by === currentUser.email);
        }
        return cached.filter(t => t.team_id === selectedTeamId);
      }

      let fetched = [];
      if (selectedTeamId === "personal") {
        // Only fetch personal tasks — no team_id, created by this user
        // Assigned-to tasks are intentionally excluded here to avoid team tasks bleeding in;
        // they appear under the relevant team workspace instead.
        fetched = await base44.entities.Task.filter(
          { created_by: currentUser.email, team_id: null },
          '-created_date'
        );
      } else {
        fetched = await base44.entities.Task.filter({ team_id: selectedTeamId }, '-created_date');
      }

      // Update cache
      if (fetched.length > 0) await cacheEntities('Task', fetched);
      return fetched;
    },
    enabled: !!currentUser,
    staleTime: isOnline ? 30_000 : Infinity, // 30s cache when online
  });

  // Merge AI scores into raw tasks if available
  const tasks = rawTasks.map(t => {
    const aiTask = aiPrioritizedTasks?.find(a => a.id === t.id);
    return aiTask ? { ...t, ...aiTask } : t;
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', currentUser?.email],
    queryFn: () => base44.entities.Goal.filter({ created_by: currentUser.email }),
    enabled: !!currentUser,
    staleTime: 5 * 60_000,
  });

  const { data: skills = [] } = useQuery({
    queryKey: ['skills', currentUser?.email],
    queryFn: () => base44.entities.Skill.filter({ created_by: currentUser.email }),
    enabled: !!currentUser,
    staleTime: 5 * 60_000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', currentUser?.id],
    queryFn: async () => {
      const allTeams = await base44.entities.Team.list();
      return allTeams.filter(team =>
        team.owner_id === currentUser.id || team.member_ids?.includes(currentUser.id)
      );
    },
    enabled: !!currentUser,
    staleTime: 5 * 60_000,
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
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData(['tasks', currentUser?.email, selectedTeamId]);
      queryClient.setQueryData(['tasks', currentUser?.email, selectedTeamId], (old = []) =>
        old.filter(t => t.id !== taskId)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['tasks', currentUser?.email, selectedTeamId], ctx.previous);
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
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData(['tasks', currentUser?.email, selectedTeamId]);
      queryClient.setQueryData(['tasks', currentUser?.email, selectedTeamId], (old = []) =>
        old.map(t => t.id === id ? { ...t, ...data } : t)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['tasks', currentUser?.email, selectedTeamId], ctx.previous);
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
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData(['tasks', currentUser?.email, selectedTeamId]);
      const completedSubtasks = task.subtasks?.map(st => ({ ...st, completed: true })) || [];
      queryClient.setQueryData(['tasks', currentUser?.email, selectedTeamId], (old = []) =>
        old.map(t => t.id === task.id ? { ...t, status: 'completed', subtasks: completedSubtasks } : t)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['tasks', currentUser?.email, selectedTeamId], ctx.previous);
    },
    onSuccess: (_data, task) => {
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

  const handleLoadRoutineTemplate = async (template) => {
    const today = new Date().toISOString().split('T')[0];
    for (const taskDef of (template.tasks || [])) {
      const newTask = {
        ...taskDef,
        status: 'not_started',
        due_date: today,
        is_recurring: !!(taskDef.recurrence_pattern && taskDef.recurrence_pattern !== 'none'),
        subtasks: (taskDef.subtasks || []).map(s => ({ ...s, completed: false })),
        team_id: selectedTeamId !== 'personal' ? selectedTeamId : undefined,
      };
      await base44.entities.Task.create(newTask);
    }
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
      const result = await analyzeTaskPriority(activeTasks, allUserTasks, preferences, strategyHint, goals, skills);
      setAiPrioritizedTasks(result.tasks);
      setAiStrategy(result.strategy);
      setAiRecommendedFocus(result.recommended_focus);
      setShowAIInsights(true);
      toast.success("AI prioritization complete! ✨");
      if (result.goal_insights) setAiStrategy(prev => prev + (prev ? '\n\n' : '') + '🎯 ' + result.goal_insights);
    } catch (error) {
      console.error("AI prioritization error:", error);
      toast.error("Failed to analyze priorities");
    }
    setIsAnalyzingPriority(false);
  };

  const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 };
  const PRIORITY_ORDER = { must_do: 0, should_do: 1, could_do: 2 };

  const filteredTasks = (() => {
    let result = tasks.filter(task => {
      if (task.is_recurring && !task.parent_recurring_task_id && !task.due_date) return false;
      const statusMatch = filter === "all" ? task.status !== 'completed' : task.status === filter;
      const priorityMatch = taskFilters.priority === "all" || task.task_priority === taskFilters.priority;
      const difficultyMatch = taskFilters.difficulty === "all" || task.difficulty === taskFilters.difficulty;
      const categoryMatch = taskFilters.category === "all" || task.category === taskFilters.category;
      return statusMatch && priorityMatch && difficultyMatch && categoryMatch;
    });

    // Pinned always float to top; then apply sort
    result = [...result].sort((a, b) => {
      const aPinned = pinnedTaskIds.includes(a.id);
      const bPinned = pinnedTaskIds.includes(b.id);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;

      if (viewMode === "ai" && aiPrioritizedTasks && taskSort === "default") {
        return (b.ai_priority_score || 0) - (a.ai_priority_score || 0);
      }

      switch (taskSort) {
        case "due_date_asc":
          return (a.due_date || "9999") < (b.due_date || "9999") ? -1 : 1;
        case "due_date_desc":
          return (a.due_date || "") > (b.due_date || "") ? -1 : 1;
        case "difficulty_asc":
          return (DIFFICULTY_ORDER[a.difficulty] ?? 1) - (DIFFICULTY_ORDER[b.difficulty] ?? 1);
        case "difficulty_desc":
          return (DIFFICULTY_ORDER[b.difficulty] ?? 1) - (DIFFICULTY_ORDER[a.difficulty] ?? 1);
        case "priority_desc":
          return (PRIORITY_ORDER[a.task_priority] ?? 99) - (PRIORITY_ORDER[b.task_priority] ?? 99);
        case "estimated_asc":
          return (a.estimated_minutes || 0) - (b.estimated_minutes || 0);
        case "estimated_desc":
          return (b.estimated_minutes || 0) - (a.estimated_minutes || 0);
        default:
          return 0;
      }
    });

    return result;
  })();

  const visibleTasks = tasks.filter(t => {
    const priorityMatch = taskFilters.priority === "all" || t.task_priority === taskFilters.priority;
    const difficultyMatch = taskFilters.difficulty === "all" || t.difficulty === taskFilters.difficulty;
    const categoryMatch = taskFilters.category === "all" || t.category === taskFilters.category;
    return priorityMatch && difficultyMatch && categoryMatch;
  });

  const statusCounts = {
    all: visibleTasks.length,
    not_started: visibleTasks.filter(t => t.status === "not_started").length,
    in_progress: visibleTasks.filter(t => t.status === "in_progress").length,
    completed: visibleTasks.filter(t => t.status === "completed").length,
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

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
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
            <MobileSelect
              value={selectedTeamId}
              onValueChange={setSelectedTeamId}
              placeholder="Select workspace"
              className="w-full sm:w-64"
              options={[
                { value: "personal", label: "Personal Tasks" },
                ...teams.map(team => ({ value: team.id, label: team.name }))
              ]}
            />
          </div>
          {selectedTeamId !== "personal" && currentTeam && (
            <div className="flex items-center gap-3 mb-1">
              <TeamMemberAvatars team={currentTeam} currentUser={currentUser} />
              <button
                onClick={() => setShowInviteModal(true)}
                className="text-xs text-purple-600 hover:underline font-medium"
              >
                + Invite members
              </button>
            </div>
          )}
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
            <Button
              variant="outline"
              onClick={() => setShowCalendarSync(true)}
              className="border-purple-200 hover:bg-purple-50 flex-1 sm:flex-none"
            >
              <Calendar className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Sync to Calendar</span>
              <span className="sm:hidden">Sync</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowInviteModal(true)}
              className="border-purple-200 hover:bg-purple-50 flex-1 sm:flex-none"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Share List</span>
              <span className="sm:hidden">Share</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowRoutineTemplates(true)}
              className="border-purple-200 hover:bg-purple-50 flex-1 sm:flex-none"
            >
              <BookTemplate className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Routines</span>
              <span className="sm:hidden">Routines</span>
            </Button>
            <Link to={createPageUrl("TaskBreakdown")} className="flex-1 sm:flex-none">
              <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold shadow-lg w-full">
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </Link>
          </div>
        </motion.div>

        <TaskFilterSortBar
          filters={taskFilters}
          onFiltersChange={setTaskFilters}
          sort={taskSort}
          onSortChange={setTaskSort}
        />

        {showAIInsights && viewMode === "ai" && (
          <AIStrategyBanner
            strategy={aiStrategy}
            recommendedFocus={aiRecommendedFocus}
            onDismiss={() => setShowAIInsights(false)}
          />
        )}

        {/* Bulk action bar */}
        <AnimatePresence>
          {isSelecting && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="bg-white dark:bg-gray-800 border border-purple-200 dark:border-gray-600 rounded-xl shadow-md overflow-hidden"
            >
              {/* Main action row */}
              <div className="flex items-center gap-2 px-4 py-3 flex-wrap">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex-1">
                  {selectedTaskIds.size} selected
                </span>
                <Button size="sm" onClick={handleBulkComplete} className="bg-green-500 hover:bg-green-600 text-white gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Complete</span>
                </Button>
                <Button
                  size="sm"
                  variant={bulkEditMode === 'category' ? 'default' : 'outline'}
                  onClick={() => setBulkEditMode(prev => prev === 'category' ? null : 'category')}
                  className="gap-1.5 border-purple-200"
                >
                  <Tag className="w-4 h-4" />
                  <span className="hidden sm:inline">Category</span>
                </Button>
                <Button
                  size="sm"
                  variant={bulkEditMode === 'difficulty' ? 'default' : 'outline'}
                  onClick={() => setBulkEditMode(prev => prev === 'difficulty' ? null : 'difficulty')}
                  className="gap-1.5 border-purple-200"
                >
                  <Zap className="w-4 h-4" />
                  <span className="hidden sm:inline">Difficulty</span>
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setShowBulkDeleteConfirm(true)} className="gap-1.5">
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
                <button onClick={clearSelection} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Inline category picker */}
              <AnimatePresence>
                {bulkEditMode === 'category' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-purple-100 dark:border-gray-700 px-4 py-3"
                  >
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Set category for all selected</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'work', label: '💼 Work' },
                        { value: 'personal', label: '🙂 Personal' },
                        { value: 'health', label: '💪 Health' },
                        { value: 'creative', label: '🎨 Creative' },
                        { value: 'learning', label: '📚 Learning' },
                        { value: 'household', label: '🏠 Household' },
                        { value: 'other', label: '📌 Other' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => handleBulkUpdate('category', opt.value)}
                          className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-purple-900/50 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Inline difficulty picker */}
              <AnimatePresence>
                {bulkEditMode === 'difficulty' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-purple-100 dark:border-gray-700 px-4 py-3"
                  >
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Set difficulty for all selected</p>
                    <div className="flex gap-3">
                      {[
                        { value: 'easy', label: '🟢 Easy', color: 'hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/50 dark:hover:text-green-300' },
                        { value: 'medium', label: '🟡 Medium', color: 'hover:bg-yellow-100 hover:text-yellow-700 dark:hover:bg-yellow-900/50 dark:hover:text-yellow-300' },
                        { value: 'hard', label: '🔴 Hard', color: 'hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/50 dark:hover:text-red-300' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => handleBulkUpdate('difficulty', opt.value)}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 transition-colors ${opt.color}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

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
                      <button
                        onClick={() => toggleSelectTask(task.id)}
                        className="flex-shrink-0 mt-3 p-0.5 text-gray-400 hover:text-purple-600 transition-colors"
                      >
                        {selectedTaskIds.has(task.id)
                          ? <CheckSquare className="w-5 h-5 text-purple-600" />
                          : <Square className="w-5 h-5" />}
                      </button>
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
                         onStart={(task) => window.location.href = createPageUrl("FocusSession") + `?taskId=${task.id}&taskTitle=${encodeURIComponent(task.title)}`}
                         onEdit={(task, action) => {
                           if (action === 'ai-breakdown') {
                             setTaskToBreakdown(task);
                             setShowAIBreakdown(true);
                           } else {
                             window.location.href = createPageUrl("TaskBreakdown") + `?editTaskId=${task.id}`;
                           }
                         }}
                         onDelete={(task) => setTaskToDelete(task)}
                         onSpread={(task) => setSpreadTask(task)}
                         onSubtaskToggle={handleSubtaskToggle}
                         onSetDependency={(task) => { setSelectedDependencyTask(task); setShowDependencyModal(true); }}
                         onSetRecurring={(task) => { setSelectedRecurringTask(task); setShowRecurringModal(true); }}
                         onOpenCollabView={(task) => { setCollabTask(task); setShowCollabView(true); }}
                         onQuickComplete={handleQuickComplete}
                         onChangePriority={handleChangePriority}
                         onUpdateTask={(id, data) => updateTaskMutation.mutate({ id, data })}
                        />
                        {task.team_id && (
                          <div className="ml-4 mt-2">
                            <AssignWithNotification
                              task={task}
                              teamMembers={getTeamMembers(task)}
                              currentUser={currentUser}
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
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => toggleSelectTask(task.id)}
                                  className="p-0.5 text-gray-400 hover:text-purple-600 transition-colors"
                                >
                                  {selectedTaskIds.has(task.id)
                                    ? <CheckSquare className="w-5 h-5 text-purple-600" />
                                    : <Square className="w-5 h-5" />}
                                </button>
                              </div>
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
                               onStart={(task) => window.location.href = createPageUrl("FocusSession") + `?taskId=${task.id}&taskTitle=${encodeURIComponent(task.title)}`}
                               onEdit={(task, action) => {
                                 if (action === 'ai-breakdown') {
                                   setTaskToBreakdown(task);
                                   setShowAIBreakdown(true);
                                 } else {
                                   window.location.href = createPageUrl("TaskBreakdown") + `?editTaskId=${task.id}`;
                                 }
                               }}
                               onDelete={(task) => setTaskToDelete(task)}
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
                               onUpdateTask={(id, data) => updateTaskMutation.mutate({ id, data })}
                              />
                              {task.team_id && (
                                 <div className="ml-4">
                                   <AssignWithNotification
                                     task={task}
                                     teamMembers={getTeamMembers(task)}
                                     currentUser={currentUser}
                                     onAssign={(data) => updateTaskMutation.mutate({ id: task.id, data })}
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
                <MobileSelect
                  value=""
                  onValueChange={handleAddDependency}
                  placeholder="Select a task"
                  options={tasks
                    .filter(t =>
                      t.id !== selectedDependencyTask?.id &&
                      !selectedDependencyTask?.blocked_by?.includes(t.id)
                    )
                    .map(t => ({ value: t.id, label: t.title }))}
                />
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
          lowAIMode={(currentUser?.ai_prioritization_preferences?.low_ai_categories || []).includes(taskToBreakdown?.category)}
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

        <RoutineTemplatesModal
          open={showRoutineTemplates}
          onOpenChange={setShowRoutineTemplates}
          tasks={tasks}
          onLoadTemplate={handleLoadRoutineTemplate}
        />

        <SharedTaskListInviteModal
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
          currentUser={currentUser}
          teams={teams}
          onTeamCreated={(team) => {
            queryClient.invalidateQueries({ queryKey: ['teams'] });
            setSelectedTeamId(team.id);
          }}
        />

        <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedTaskIds.size} task{selectedTaskIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {selectedTaskIds.size} selected task{selectedTaskIds.size !== 1 ? 's' : ''}. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleBulkDelete}>
                Delete all
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!taskToDelete} onOpenChange={(open) => { if (!open) setTaskToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete task?</AlertDialogTitle>
              <AlertDialogDescription>
                "{taskToDelete?.title}" will be permanently deleted. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  deleteTaskMutation.mutate(taskToDelete.id);
                  setTaskToDelete(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
    </PullToRefresh>
  );
}