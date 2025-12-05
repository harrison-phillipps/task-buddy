import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle, ExternalLink, RefreshCw, Loader2, Plus } from "lucide-react";
import AddEventModal from "../components/calendar/AddEventModal";
import CalendarEventsList from "../components/calendar/CalendarEventsList";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";

export default function CalendarView() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);

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

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', currentUser?.email],
    queryFn: () => currentUser ? base44.entities.Task.filter({ created_by: currentUser.email }, '-created_date') : [],
    enabled: !!currentUser,
  });

  const { data: calendarEvents = [] } = useQuery({
    queryKey: ['calendarEvents', currentUser?.email],
    queryFn: () => currentUser ? base44.entities.CalendarEvent.filter({ created_by: currentUser.email }, 'start_date') : [],
    enabled: !!currentUser,
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.CalendarEvent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id) => base44.entities.CalendarEvent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    },
  });

  const createTaskFromEventMutation = useMutation({
    mutationFn: async (event) => {
      const task = await base44.entities.Task.create({
        title: event.title,
        description: event.description || '',
        status: 'not_started',
        category: 'personal',
        difficulty: 'medium',
        estimated_minutes: event.duration_minutes || 60,
        due_date: event.start_date
      });
      // Update event to link to task
      await base44.entities.CalendarEvent.update(event.id, {
        task_id: task.id,
        source: 'task'
      });
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    },
  });

  const syncTaskToCalendar = async (task, date) => {
    const existingEvent = calendarEvents.find(e => e.task_id === task.id);
    if (existingEvent) return;

    await createEventMutation.mutateAsync({
      title: task.title,
      description: task.description,
      start_date: date || task.due_date || format(new Date(), 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: format(new Date(new Date().setMinutes(new Date().getMinutes() + (task.estimated_minutes || 30))), 'HH:mm'),
      duration_minutes: task.estimated_minutes || 30,
      source: 'task',
      task_id: task.id,
      color: '#8B5CF6'
    });

    await base44.entities.Task.update(task.id, { calendar_synced: true });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  // Get synced tasks (tasks with calendar_synced = true)
  const syncedTasks = tasks.filter(t => t.calendar_synced);

  // Get tasks scheduled for each day (from subtasks with scheduled_date)
  const getTasksForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const tasksForDay = [];

    tasks.forEach(task => {
      // Check if task has due_date matching
      if (task.due_date === dateStr) {
        tasksForDay.push({ ...task, type: 'due_date' });
      }

      // Check subtasks with scheduled_date
      if (task.subtasks) {
        task.subtasks.forEach((subtask, index) => {
          if (subtask.scheduled_date === dateStr) {
            tasksForDay.push({
              ...task,
              type: 'subtask',
              subtaskIndex: index,
              subtask: subtask
            });
          }
        });
      }
    });

    return tasksForDay;
  };

  // Get calendar events for a specific date
  const getEventsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return calendarEvents.filter(event => event.start_date === dateStr);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const navigateWeek = (direction) => {
    setWeekStart(prev => addDays(prev, direction * 7));
  };

  const handleMarkComplete = async (task, subtaskIndex = null) => {
    if (subtaskIndex !== null) {
      // Mark subtask complete
      const updatedSubtasks = task.subtasks.map((st, i) => 
        i === subtaskIndex ? { ...st, completed: !st.completed } : st
      );
      updateTaskMutation.mutate({
        id: task.id,
        data: { subtasks: updatedSubtasks }
      });
    } else {
      // Mark entire task complete
      updateTaskMutation.mutate({
        id: task.id,
        data: { status: task.status === 'completed' ? 'in_progress' : 'completed' }
      });
    }
  };

  const todayTasks = getTasksForDate(selectedDate);
  const todayEvents = getEventsForDate(selectedDate);

  const handleAddEvent = async (eventData) => {
    await createEventMutation.mutateAsync(eventData);
  };

  const handleConvertToTask = async (event) => {
    await createTaskFromEventMutation.mutateAsync(event);
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
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-3">
              <Calendar className="w-8 h-8 text-purple-600" />
              Calendar View
            </h1>
            <p className="text-gray-600 mt-1">View and manage your synced tasks</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddEvent(true)}
              className="bg-gradient-to-r from-purple-500 to-teal-500 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
            {currentUser?.google_calendar_connected && (
              <Button
                variant="outline"
                onClick={() => setIsRefreshing(true)}
                disabled={isRefreshing}
                className="border-purple-200"
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
            )}
          </div>
        </motion.div>

        {/* Week Navigation */}
        <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-lg font-semibold text-gray-900">
                {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Week Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, index) => {
                const dayTasks = getTasksForDate(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDate);

                return (
                  <motion.button
                    key={index}
                    onClick={() => setSelectedDate(day)}
                    whileHover={{ scale: 1.02 }}
                    className={`p-3 rounded-xl text-center transition-all ${
                      isSelected
                        ? "bg-gradient-to-br from-purple-500 to-teal-500 text-white shadow-lg"
                        : isToday
                        ? "bg-purple-100 border-2 border-purple-300"
                        : "bg-gray-50 hover:bg-purple-50"
                    }`}
                  >
                    <p className={`text-xs font-medium ${isSelected ? "text-purple-100" : "text-gray-500"}`}>
                      {format(day, 'EEE')}
                    </p>
                    <p className={`text-xl font-bold ${isSelected ? "text-white" : "text-gray-900"}`}>
                      {format(day, 'd')}
                    </p>
                    {dayTasks.length > 0 && (
                      <div className={`mt-1 text-xs ${isSelected ? "text-purple-100" : "text-purple-600"}`}>
                        {dayTasks.length + getEventsForDate(day).length} item{(dayTasks.length + getEventsForDate(day).length) > 1 ? 's' : ''}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{format(selectedDate, 'EEEE, MMMM d')}</span>
                <Badge className="bg-purple-100 text-purple-700">
                  {todayTasks.length + todayEvents.length} item{(todayTasks.length + todayEvents.length) !== 1 ? 's' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Calendar Events Section */}
              {todayEvents.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Calendar Events</p>
                  <CalendarEventsList
                    events={todayEvents}
                    onDelete={(id) => deleteEventMutation.mutate(id)}
                    onConvertToTask={handleConvertToTask}
                    compact
                  />
                </div>
              )}

              {todayTasks.length === 0 && todayEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No tasks scheduled for this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {todayTasks.map((item, index) => (
                      <motion.div
                        key={`${item.id}-${item.subtaskIndex || 'main'}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 rounded-xl border transition-all ${
                          (item.type === 'subtask' && item.subtask?.completed) || item.status === 'completed'
                            ? "bg-green-50 border-green-200"
                            : "bg-white border-gray-200 hover:border-purple-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {item.type === 'subtask' ? (
                                <Badge variant="outline" className="text-xs">Step</Badge>
                              ) : (
                                <Badge className="bg-purple-100 text-purple-700 text-xs">Task</Badge>
                              )}
                              {item.calendar_synced && (
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                  📅 Synced
                                </Badge>
                              )}
                            </div>
                            <h4 className={`font-medium ${
                              (item.type === 'subtask' && item.subtask?.completed) || item.status === 'completed'
                                ? "line-through text-gray-400"
                                : "text-gray-900"
                            }`}>
                              {item.type === 'subtask' ? item.subtask.title : item.title}
                            </h4>
                            {item.type === 'subtask' && (
                              <p className="text-xs text-gray-500 mt-1">From: {item.title}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {item.type === 'subtask' 
                                ? `${item.subtask.estimated_minutes || 15}min`
                                : `${item.estimated_minutes || 30}min`
                              }
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkComplete(item, item.type === 'subtask' ? item.subtaskIndex : null)}
                              className={
                                (item.type === 'subtask' && item.subtask?.completed) || item.status === 'completed'
                                  ? "text-green-600"
                                  : "text-gray-400 hover:text-green-600"
                              }
                            >
                              <CheckCircle className="w-5 h-5" />
                            </Button>
                            {item.calendar_event_id && (
                              <a
                                href={`https://calendar.google.com/calendar/event?eid=${item.calendar_event_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Synced Tasks Overview */}
          <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-teal-600" />
                Synced with Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {syncedTasks.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No tasks synced to Google Calendar yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Go to My Tasks and click "Sync to Calendar"
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {syncedTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`p-3 rounded-lg border transition-all ${
                        task.status === 'completed'
                          ? "bg-green-50 border-green-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${
                            task.status === 'completed' ? "line-through text-gray-400" : "text-gray-900"
                          }`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">{task.category}</Badge>
                            {task.due_date && (
                              <span className="text-xs text-gray-500">
                                Due: {format(parseISO(task.due_date), 'MMM d')}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkComplete(task)}
                          className={task.status === 'completed' ? "text-green-600" : "text-gray-400"}
                        >
                          <CheckCircle className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AddEventModal
        open={showAddEvent}
        onOpenChange={setShowAddEvent}
        onSave={handleAddEvent}
        defaultDate={format(selectedDate, 'yyyy-MM-dd')}
      />
    </div>
  );
}