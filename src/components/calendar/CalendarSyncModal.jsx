import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, CheckCircle, Loader2, ExternalLink, Unlink, RefreshCw, Repeat } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays } from "date-fns";

export default function CalendarSyncModal({ 
  open, 
  onOpenChange, 
  tasks = [],
  goals = [],
  currentUser,
  selectedTeamId = null,
  onSyncComplete 
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [selectedGoals, setSelectedGoals] = useState(new Set());
  const [syncSettings, setSyncSettings] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState(null);
  const [syncType, setSyncType] = useState("tasks");
  const provider = currentUser?.calendar_provider || 'google';
  const calendarName = provider === 'outlook' ? 'Outlook Calendar' : 'Google Calendar';

  useEffect(() => {
    // Check connection via fetchCalendarEvents function (uses app connector)
    if (open) {
      checkConnection();
    }
  }, [open]);

  const checkConnection = async () => {
    setIsConnecting(true);
    try {
      const res = await base44.functions.invoke('fetchCalendarEvents', {});
      if (res.data?.success || res.data?.events_synced !== undefined) {
        setIsConnected(true);
      }
    } catch (error) {
      console.error("Calendar connector not available:", error);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await base44.auth.updateMe({ calendar_connected: false, calendar_provider: null });
      setIsConnected(false);
    } catch (error) {
      console.error("Error disconnecting:", error);
    }
  };

  const toggleTaskSelection = (taskId) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
      const newSettings = { ...syncSettings };
      delete newSettings[`task-${taskId}`];
      setSyncSettings(newSettings);
    } else {
      newSelected.add(taskId);
      setSyncSettings({
        ...syncSettings,
        [`task-${taskId}`]: {
          date: format(new Date(), 'yyyy-MM-dd'),
          time: '09:00',
          recurring: 'none',
          recurrenceEnd: ''
        }
      });
    }
    setSelectedTasks(newSelected);
  };

  const toggleGoalSelection = (goalId) => {
    const newSelected = new Set(selectedGoals);
    if (newSelected.has(goalId)) {
      newSelected.delete(goalId);
      const newSettings = { ...syncSettings };
      delete newSettings[`goal-${goalId}`];
      setSyncSettings(newSettings);
    } else {
      newSelected.add(goalId);
      const goal = goals.find(g => g.id === goalId);
      setSyncSettings({
        ...syncSettings,
        [`goal-${goalId}`]: {
          date: goal.target_date || format(new Date(), 'yyyy-MM-dd'),
          time: '09:00',
          recurring: 'none',
          recurrenceEnd: ''
        }
      });
    }
    setSelectedGoals(newSelected);
  };

  const updateTaskSettings = (taskId, field, value) => {
    setSyncSettings({
      ...syncSettings,
      [taskId]: {
        ...syncSettings[taskId],
        [field]: value
      }
    });
  };

  const handleSync = async () => {
    if (selectedTasks.size === 0 && selectedGoals.size === 0) return;
    
    setIsSyncing(true);
    setSyncResults(null);
    
    const results = { success: [], failed: [] };
    
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Sync tasks
    for (const taskId of selectedTasks) {
      const task = tasks.find(t => t.id === taskId);
      const settings = syncSettings[`task-${taskId}`];
      if (!task || !settings) continue;
      
      try {
        const fnName = provider === 'outlook' ? 'syncTaskToOutlook' : 'syncTaskToGoogleCalendar';
        const res = await base44.functions.invoke(fnName, {
          task,
          scheduled_date: settings.date,
          scheduled_time: settings.time,
          timezone: tz,
          recurring: settings.recurring || 'none',
          recurrence_end: settings.recurrenceEnd || null,
        });
        const syncResult = res.data;
        if (syncResult?.success) {
          results.success.push({ item: task, type: 'task', event_id: syncResult.event_id, link: syncResult.html_link });
          await base44.entities.Task.update(taskId, { calendar_event_id: syncResult.event_id, calendar_synced: true });
        } else {
          results.failed.push({ item: task, type: 'task', error: syncResult?.error || 'Unknown error' });
        }
      } catch (error) {
        results.failed.push({ item: task, type: 'task', error: error.message });
      }
    }
    
    // Sync goals (as calendar events)
    for (const goalId of selectedGoals) {
      const goal = goals.find(g => g.id === goalId);
      const settings = syncSettings[`goal-${goalId}`];
      if (!goal || !settings) continue;
      
      try {
        const fnName = provider === 'outlook' ? 'syncTaskToOutlook' : 'syncTaskToGoogleCalendar';
        const res = await base44.functions.invoke(fnName, {
          task: { title: goal.title, description: goal.description, estimated_minutes: 60 },
          scheduled_date: settings.date,
          scheduled_time: settings.time,
          timezone: tz,
          recurring: settings.recurring || 'none',
          recurrence_end: settings.recurrenceEnd || null,
        });
        const syncResult = res.data;
        if (syncResult?.success) {
          results.success.push({ item: goal, type: 'goal', event_id: syncResult.event_id, link: syncResult.html_link });
          await base44.entities.Goal.update(goalId, { calendar_event_id: syncResult.event_id, calendar_synced: true });
        } else {
          results.failed.push({ item: goal, type: 'goal', error: syncResult?.error || 'Unknown error' });
        }
      } catch (error) {
        results.failed.push({ item: goal, type: 'goal', error: error.message });
      }
    }
    
    setSyncResults(results);
    setIsSyncing(false);
    
    if (results.success.length > 0 && onSyncComplete) {
      onSyncComplete(results);
    }
  };

  // Filter by selected team if specified
  const incompleteTasks = tasks.filter(t => {
    if (t.status === 'completed') return false;
    if (selectedTeamId === "personal") return !t.team_id;
    if (selectedTeamId) return t.team_id === selectedTeamId;
    return true;
  });
  
  const activeGoals = goals.filter(g => {
    if (g.status === 'completed') return false;
    if (selectedTeamId === "personal") return !g.team_id;
    if (selectedTeamId) return g.team_id === selectedTeamId;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Calendar Sync
          </DialogTitle>
          <DialogDescription>
            {selectedTeamId === "personal" 
              ? `Sync your personal tasks to ${calendarName}`
              : selectedTeamId
              ? `Sync team tasks to ${calendarName}`
              : `Sync your tasks to ${calendarName} for better time blocking`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Connection Status */}
          <Card className={isConnected ? "border-green-200 bg-green-50" : "border-gray-200"}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isConnected ? "bg-green-100" : "bg-gray-100"
                  }`}>
                    <svg viewBox="0 0 24 24" className="w-6 h-6">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{calendarName}</p>
                    <p className="text-sm text-gray-500">
                      {isConnected ? "Connected" : "Not connected"}
                    </p>
                  </div>
                </div>
                
                {isConnecting ? (
                  <Button disabled className="bg-blue-600">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </Button>
                ) : isConnected ? (
                  <Button variant="outline" size="sm" onClick={handleDisconnect}>
                    <Unlink className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                ) : (
                  <Button onClick={checkConnection} className="bg-blue-600 hover:bg-blue-700">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {isConnected && (
            <>
              {/* Type Selector */}
              <Tabs value={syncType} onValueChange={setSyncType}>
                <TabsList className="w-full">
                  <TabsTrigger value="tasks" className="flex-1">
                    Tasks ({incompleteTasks.length})
                  </TabsTrigger>
                  <TabsTrigger value="goals" className="flex-1">
                    Goals ({activeGoals.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Task Selection */}
              {syncType === "tasks" && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Select tasks to sync</Label>
                
                {incompleteTasks.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No incomplete tasks to sync
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {incompleteTasks.map(task => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`p-3 rounded-lg border transition-all ${
                          selectedTasks.has(task.id) 
                            ? "border-purple-300 bg-purple-50" 
                            : "border-gray-200 bg-white hover:border-purple-200"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedTasks.has(task.id)}
                            onCheckedChange={() => toggleTaskSelection(task.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-gray-900 truncate">{task.title}</p>
                              {task.team_id && (
                                <Badge className="bg-teal-100 text-teal-700 text-xs">Team</Badge>
                              )}
                              {task.calendar_synced && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                  Synced
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <Badge variant="secondary" className="text-xs">{task.category}</Badge>
                              <span>~{task.estimated_minutes || 30}min</span>
                            </div>
                            
                            <AnimatePresence>
                              {selectedTasks.has(task.id) && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-3 pt-3 border-t border-purple-200 space-y-3"
                                >
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-xs text-gray-600">Date</Label>
                                      <Input
                                        type="date"
                                        value={syncSettings[`task-${task.id}`]?.date || ''}
                                        onChange={(e) => updateTaskSettings(`task-${task.id}`, 'date', e.target.value)}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs text-gray-600">Start Time</Label>
                                      <Input
                                        type="time"
                                        value={syncSettings[`task-${task.id}`]?.time || '09:00'}
                                        onChange={(e) => updateTaskSettings(`task-${task.id}`, 'time', e.target.value)}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="p-2 bg-purple-50 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Repeat className="w-3 h-3 text-purple-600" />
                                      <Label className="text-xs text-purple-700 font-medium">Repeat</Label>
                                    </div>
                                    <Select
                                      value={syncSettings[`task-${task.id}`]?.recurring || 'none'}
                                      onValueChange={(value) => updateTaskSettings(`task-${task.id}`, 'recurring', value)}
                                    >
                                      <SelectTrigger className="h-8 text-sm bg-white">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">No repeat</SelectItem>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="weekdays">Weekdays (Mon-Fri)</SelectItem>
                                        <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    
                                    {syncSettings[`task-${task.id}`]?.recurring && syncSettings[`task-${task.id}`]?.recurring !== 'none' && (
                                      <div className="mt-2">
                                        <Label className="text-xs text-gray-600">Until (optional)</Label>
                                        <Input
                                          type="date"
                                          value={syncSettings[`task-${task.id}`]?.recurrenceEnd || ''}
                                          onChange={(e) => updateTaskSettings(`task-${task.id}`, 'recurrenceEnd', e.target.value)}
                                          min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                                          className="h-8 text-sm mt-1"
                                          placeholder="End date"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
              )}

              {/* Goal Selection */}
              {syncType === "goals" && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Select goals to sync</Label>
                  
                  {activeGoals.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No active goals to sync
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {activeGoals.map(goal => (
                        <motion.div
                          key={goal.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`p-3 rounded-lg border transition-all ${
                            selectedGoals.has(goal.id) 
                              ? "border-teal-300 bg-teal-50" 
                              : "border-gray-200 bg-white hover:border-teal-200"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedGoals.has(goal.id)}
                              onCheckedChange={() => toggleGoalSelection(goal.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 truncate">{goal.title}</p>
                                {goal.calendar_synced && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                    Synced
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <Badge variant="secondary" className="text-xs">{goal.type}</Badge>
                                {goal.target_date && (
                                  <span>Target: {format(parseISO(goal.target_date), 'MMM d, yyyy')}</span>
                                )}
                              </div>
                              
                              <AnimatePresence>
                                {selectedGoals.has(goal.id) && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-3 pt-3 border-t border-teal-200 space-y-3"
                                  >
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <Label className="text-xs text-gray-600">Reminder Date</Label>
                                        <Input
                                          type="date"
                                          value={syncSettings[`goal-${goal.id}`]?.date || ''}
                                          onChange={(e) => updateTaskSettings(`goal-${goal.id}`, 'date', e.target.value)}
                                          className="h-8 text-sm"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs text-gray-600">Time</Label>
                                        <Input
                                          type="time"
                                          value={syncSettings[`goal-${goal.id}`]?.time || '09:00'}
                                          onChange={(e) => updateTaskSettings(`goal-${goal.id}`, 'time', e.target.value)}
                                          className="h-8 text-sm"
                                        />
                                      </div>
                                    </div>
                                    
                                    <div className="p-2 bg-teal-50 rounded-lg">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Repeat className="w-3 h-3 text-teal-600" />
                                        <Label className="text-xs text-teal-700 font-medium">Check-in Frequency</Label>
                                      </div>
                                      <Select
                                        value={syncSettings[`goal-${goal.id}`]?.recurring || 'none'}
                                        onValueChange={(value) => updateTaskSettings(`goal-${goal.id}`, 'recurring', value)}
                                      >
                                        <SelectTrigger className="h-8 text-sm bg-white">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">One-time reminder</SelectItem>
                                          <SelectItem value="weekly">Weekly check-in</SelectItem>
                                          <SelectItem value="biweekly">Bi-weekly check-in</SelectItem>
                                          <SelectItem value="monthly">Monthly check-in</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sync Results */}
              <AnimatePresence>
                {syncResults && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    {syncResults.success.length > 0 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-medium text-green-800 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          {syncResults.success.length} task(s) synced successfully!
                        </p>
                        <div className="mt-2 space-y-1">
                          {syncResults.success.map(({ item, type, link }) => (
                            <a 
                              key={item.id}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-green-700 hover:underline flex items-center gap-1"
                            >
                              {item.title} ({type}) <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {syncResults.failed.length > 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-medium text-red-800">
                          {syncResults.failed.length} task(s) failed to sync
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sync Button */}
              <Button
                onClick={handleSync}
                disabled={(selectedTasks.size === 0 && selectedGoals.size === 0) || isSyncing}
                className="w-full bg-gradient-to-r from-purple-500 to-teal-500 text-white"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync {selectedTasks.size + selectedGoals.size > 0 ? `${selectedTasks.size + selectedGoals.size} Item(s)` : "Selected Items"}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}