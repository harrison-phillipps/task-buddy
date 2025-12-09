import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Link as LinkIcon, ChevronDown, ChevronRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import TaskCard from "../components/TaskCard";
import SpreadTaskModal from "../components/dashboard/SpreadTaskModal";
import CalendarSyncModal from "../components/calendar/CalendarSyncModal";
import TaskDependencies from "../components/tasks/TaskDependencies";
import RecurringTaskModal from "../components/tasks/RecurringTaskModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TaskAssignment from "../components/team/TaskAssignment";

export default function Tasks() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const teamIdParam = urlParams.get('teamId');
  
  const [filter, setFilter] = useState("all");
  const [spreadTask, setSpreadTask] = useState(null);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [selectedDependencyTask, setSelectedDependencyTask] = useState(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [selectedRecurringTask, setSelectedRecurringTask] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(teamIdParam || "personal");

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

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', currentUser?.email, selectedTeamId],
    queryFn: async () => {
      if (!currentUser) return [];
      if (selectedTeamId === "personal") {
        return base44.entities.Task.filter({ created_by: currentUser.email, team_id: null }, '-created_date');
      }
      return base44.entities.Task.filter({ team_id: selectedTeamId }, '-created_date');
    },
    enabled: !!currentUser,
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

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: selectedTeamId !== "personal",
  });

  const currentTeam = teams.find(t => t.id === selectedTeamId);
  const teamMembers = currentTeam ? allUsers.filter(u => currentTeam.member_ids?.includes(u.id)) : [];

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => base44.entities.Task.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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

  const filteredTasks = tasks.filter(task => {
    if (filter === "all") return true;
    return task.status === filter;
  });

  const statusCounts = {
    all: tasks.length,
    not_started: tasks.filter(t => t.status === "not_started").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
  };

  // Group tasks by category
  const groupedTasks = filteredTasks.reduce((acc, task) => {
    const category = task.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
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

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent mb-3">
              {selectedTeamId === "personal" ? "My Tasks" : currentTeam?.name || "Team Tasks"}
            </h1>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="w-64">
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
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowCalendarSync(true)}
              className="border-purple-200 hover:bg-purple-50"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Sync to Calendar
            </Button>
            <Link to={createPageUrl("TaskBreakdown")}>
              <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-white/80 backdrop-blur-sm border border-purple-100">
              <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-teal-500 data-[state=active]:text-white">
                All ({statusCounts.all})
              </TabsTrigger>
              <TabsTrigger value="not_started">
                Not Started ({statusCounts.not_started})
              </TabsTrigger>
              <TabsTrigger value="in_progress">
                In Progress ({statusCounts.in_progress})
              </TabsTrigger>
              <TabsTrigger value="completed">
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
                            <TaskCard
                              task={task}
                              allTasks={tasks}
                              showTeamInfo={selectedTeamId !== "personal"}
                              onStart={(task) => window.location.href = createPageUrl("FocusSession") + `?taskId=${task.id}`}
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
                            />
                            {selectedTeamId !== "personal" && (
                              <div className="ml-4">
                                <TaskAssignment
                                  task={task}
                                  teamMembers={teamMembers}
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
      </div>
    </div>
  );
}