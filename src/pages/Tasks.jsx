import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Link as LinkIcon } from "lucide-react";
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

export default function Tasks() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [spreadTask, setSpreadTask] = useState(null);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [selectedDependencyTask, setSelectedDependencyTask] = useState(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [selectedRecurringTask, setSelectedRecurringTask] = useState(null);

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
    queryKey: ['tasks', currentUser?.email],
    queryFn: () => currentUser ? base44.entities.Task.filter({ created_by: currentUser.email }, '-created_date') : [],
    enabled: !!currentUser,
  });

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

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
              My Tasks
            </h1>
            <p className="text-gray-600 mt-1">All your tasks in one place</p>
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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <TaskCard
                  task={task}
                  allTasks={tasks}
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
              </motion.div>
            ))}
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