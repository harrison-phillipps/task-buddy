import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Brain, RefreshCw, Loader2, ChevronRight, Clock, Calendar, Target, AlertTriangle, Sparkles, Play, TrendingUp
} from "lucide-react";
import PriorityIndicator from "./dashboard/PriorityIndicator";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, differenceInDays, parseISO, isToday } from "date-fns";
import { hasFeatureAccess, UpgradePrompt } from "./subscription/FeatureGate";

const difficultyColors = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard: "bg-red-100 text-red-700"
};

const priorityColors = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700"
};

export default function AIPrioritization({ 
  tasks = [], 
  userProgress = null,
  userTier = "free",
  calendarEvents = [],
  onReorder,
  showFullList = true 
}) {
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prioritizedTasks, setPrioritizedTasks] = useState([]);
  const [lastAnalyzed, setLastAnalyzed] = useState(null);
  const [autoReprioritize, setAutoReprioritize] = useState(true);
  const [analysisReason, setAnalysisReason] = useState("");

  const incompleteTasks = tasks.filter(t => t.status !== 'completed');
  const hasAccess = hasFeatureAccess(userTier, "ai_prioritization");

  // Check if we should auto-reprioritize
  useEffect(() => {
    if (!hasAccess) return;
    if (!autoReprioritize || incompleteTasks.length === 0) return;

    const today = new Date().toDateString();
    const lastAnalyzedDate = lastAnalyzed ? new Date(lastAnalyzed).toDateString() : null;
    
    // Auto-reprioritize if:
    // 1. Never analyzed before
    // 2. New day
    // 3. Tasks changed significantly (new tasks added) - this is implicitly handled by tasks.length in deps
    if (!lastAnalyzed || lastAnalyzedDate !== today) {
      setAnalysisReason("Starting fresh for today");
      analyzeAndPrioritize();
    }
  }, [tasks.length, autoReprioritize, hasAccess]);

  const analyzeAndPrioritize = async () => {
    if (incompleteTasks.length === 0) {
      setPrioritizedTasks([]);
      return;
    }

    setIsAnalyzing(true);

    try {
      // Prepare task data for AI analysis
      const taskData = incompleteTasks.map(task => {
        const daysUntilDue = task.due_date 
          ? differenceInDays(parseISO(task.due_date), new Date())
          : null;
        
        const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
        const totalSubtasks = task.subtasks?.length || 0;
        const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

        // Check for scheduled subtasks today
        const hasScheduledToday = task.subtasks?.some(st => 
          st.scheduled_date && isToday(parseISO(st.scheduled_date))
        );

        return {
          id: task.id,
          title: task.title,
          category: task.category || 'personal',
          difficulty: task.difficulty || 'medium',
          priority: task.priority || 'medium',
          energy_needed: task.energy_level_needed || 'medium',
          estimated_minutes: task.estimated_minutes || 30,
          days_until_due: daysUntilDue,
          is_overdue: daysUntilDue !== null && daysUntilDue < 0,
          is_due_today: daysUntilDue === 0,
          is_due_soon: daysUntilDue !== null && daysUntilDue > 0 && daysUntilDue <= 3,
          status: task.status,
          progress_percent: progressPercent,
          has_scheduled_today: hasScheduledToday,
          is_blocked: task.blocked_by?.length > 0,
          is_spread: task.spread_across_days
        };
      });

      const currentHour = new Date().getHours();
      const timeOfDay = currentHour < 12 ? "morning" : currentHour < 17 ? "afternoon" : "evening";
      
      // Get today's calendar events to avoid conflicts
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayEvents = calendarEvents.filter(e => e.start_date === today);
      const busySlots = todayEvents.map(e => ({
        title: e.title,
        start: e.start_time,
        end: e.end_time,
        duration: e.duration_minutes
      }));
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI productivity coach specializing in task prioritization. Analyze these tasks and provide an optimal order with reasoning.

Current context:
- Time of day: ${timeOfDay} (${currentHour}:00)
- User's streak: ${userProgress?.current_streak || 0} days
- User's level: ${userProgress?.level || 1}
- Total focus minutes logged: ${userProgress?.total_focus_minutes || 0}

Today's calendar events (busy times to work around):
${busySlots.length > 0 ? JSON.stringify(busySlots, null, 2) : "No events scheduled"}

Tasks to prioritize:
${JSON.stringify(taskData, null, 2)}

Consider these factors in order of importance:
1. URGENCY: Overdue and due-today tasks are highest priority
2. DEADLINES: Tasks due within 3 days need attention
3. SCHEDULED: Tasks with subtasks scheduled for today
4. PROGRESS: Tasks already in-progress (momentum)
5. ENERGY MATCH: Match task difficulty with time of day (morning=high energy, evening=low)
6. QUICK WINS: Short tasks for momentum building
7. BLOCKED: Deprioritize blocked tasks
8. USER PRIORITY: Respect user-set priority levels
9. CALENDAR CONFLICTS: Consider busy calendar slots - suggest tasks that fit available time gaps

For each task, provide:
- Its optimal position (1 = do first)
- A brief reason (1 sentence, encouraging tone)
- An urgency score (1-10, 10 = most urgent)`,
        response_json_schema: {
          type: "object",
          properties: {
            prioritized_order: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task_id: { type: "string" },
                  position: { type: "number" },
                  reason: { type: "string" },
                  urgency_score: { type: "number" }
                }
              }
            },
            daily_tip: { type: "string" },
            focus_recommendation: { type: "string" }
          }
        }
      });

      // Map AI results back to tasks
      const orderedTasks = result.prioritized_order
        .sort((a, b) => a.position - b.position)
        .map(item => {
          const task = incompleteTasks.find(t => t.id === item.task_id);
          return task ? {
            ...task,
            aiReason: item.reason,
            urgencyScore: item.urgency_score,
            position: item.position
          } : null;
        })
        .filter(Boolean);

      // Add any tasks that AI might have missed
      const orderedIds = new Set(orderedTasks.map(t => t.id));
      incompleteTasks.forEach(task => {
        if (!orderedIds.has(task.id)) {
          orderedTasks.push({
            ...task,
            aiReason: "Added to your list",
            urgencyScore: 5,
            position: orderedTasks.length + 1
          });
        }
      });

      setPrioritizedTasks(orderedTasks);
      setLastAnalyzed(new Date().toISOString());
      setAnalysisReason(result.daily_tip || "Tasks prioritized for optimal productivity!");

      if (onReorder) {
        onReorder(orderedTasks);
      }

    } catch (error) {
      console.error("AI prioritization error:", error);
      // Fallback to simple sorting
      const sorted = [...incompleteTasks].sort((a, b) => {
        // Overdue first
        const aDue = a.due_date ? differenceInDays(parseISO(a.due_date), new Date()) : 999;
        const bDue = b.due_date ? differenceInDays(parseISO(b.due_date), new Date()) : 999;
        if (aDue !== bDue) return aDue - bDue;
        
        // Then by priority
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      }).map((task, idx) => ({
        ...task,
        aiReason: "Sorted by deadline and priority",
        urgencyScore: Math.max(1, 10 - idx),
        position: idx + 1
      }));

      setPrioritizedTasks(sorted);
      setAnalysisReason("Sorted by deadline and priority");
    }

    setIsAnalyzing(false);
  };

  const startTask = (task) => {
    navigate(createPageUrl("FocusSession") + `?taskId=${task.id}`);
  };

  const getUrgencyBadge = (score) => {
    if (score >= 8) return { label: "Urgent", className: "bg-red-500 text-white", priority: "critical" };
    if (score >= 6) return { label: "High", className: "bg-orange-500 text-white", priority: "high" };
    if (score >= 4) return { label: "Medium", className: "bg-yellow-500 text-white", priority: "medium" };
    return { label: "Low", className: "bg-green-500 text-white", priority: "low" };
  };

  const getAIPriorityLevel = (urgencyScore, position) => {
    if (urgencyScore >= 9 || position === 1) return "critical";
    if (urgencyScore >= 7 || position <= 2) return "high";
    if (urgencyScore >= 5 || position <= 4) return "medium";
    return "low";
  };

  // Render upgrade prompt if no access
  if (!hasAccess) {
    return <UpgradePrompt feature="AI Task Prioritization" requiredTier="pro" />;
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-purple-100 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-teal-500 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            AI Task Prioritization
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-reprioritize"
                checked={autoReprioritize}
                onCheckedChange={setAutoReprioritize}
              />
              <Label htmlFor="auto-reprioritize" className="text-xs text-gray-600">
                Auto-daily
              </Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={analyzeAndPrioritize}
              disabled={isAnalyzing}
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        
        {lastAnalyzed && (
          <p className="text-xs text-gray-500 mt-2">
            Last analyzed: {format(parseISO(lastAnalyzed), 'h:mm a')} • {analysisReason}
          </p>
        )}
      </CardHeader>

      <CardContent>
        <AnimatePresence mode="wait">
          {isAnalyzing ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <div className="relative">
                <Brain className="w-12 h-12 text-purple-300" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </motion.div>
              </div>
              <p className="text-sm text-gray-600 mt-4">Analyzing your tasks...</p>
              <p className="text-xs text-gray-400">Considering deadlines, energy, and progress</p>
            </motion.div>
          ) : prioritizedTasks.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <Target className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No tasks to prioritize</p>
              <p className="text-xs text-gray-400 mt-1">Create some tasks to get AI recommendations</p>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {/* Top Priority Highlight */}
              {prioritizedTasks[0] && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative p-4 bg-gradient-to-r from-purple-50 to-teal-50 rounded-xl border-2 border-purple-200 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200/30 to-teal-200/30 rounded-full blur-3xl" />
                  <div className="flex items-center gap-2 mb-2 relative z-10">
                    <Badge className="bg-gradient-to-r from-purple-500 to-teal-500 text-white flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      #1 Priority
                    </Badge>
                    <PriorityIndicator 
                      priority={getAIPriorityLevel(prioritizedTasks[0].urgencyScore, 1)} 
                    />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1 relative z-10">
                    {prioritizedTasks[0].title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 relative z-10">
                    💡 {prioritizedTasks[0].aiReason}
                  </p>
                  <div className="flex items-center gap-2 mb-3 flex-wrap relative z-10">
                    <Badge variant="outline" className={`${difficultyColors[prioritizedTasks[0].difficulty || 'medium']} font-medium`}>
                      {prioritizedTasks[0].difficulty || 'medium'}
                    </Badge>
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      {prioritizedTasks[0].estimated_minutes || 30}m
                    </Badge>
                    {prioritizedTasks[0].due_date && (
                      <Badge variant="outline" className={
                        differenceInDays(parseISO(prioritizedTasks[0].due_date), new Date()) <= 0
                          ? "bg-red-50 text-red-700 border-red-200"
                          : ""
                      }>
                        <Calendar className="w-3 h-3 mr-1" />
                        {differenceInDays(parseISO(prioritizedTasks[0].due_date), new Date()) < 0
                          ? "Overdue"
                          : differenceInDays(parseISO(prioritizedTasks[0].due_date), new Date()) === 0
                            ? "Due today"
                            : `${differenceInDays(parseISO(prioritizedTasks[0].due_date), new Date())}d left`
                        }
                      </Badge>
                    )}
                  </div>
                  <Button
                    onClick={() => startTask(prioritizedTasks[0])}
                    className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all relative z-10"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Now
                  </Button>
                </motion.div>
              )}

              {/* Rest of the list */}
              {showFullList && prioritizedTasks.length > 1 && (
                <div className="space-y-2 mt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Up Next
                  </p>
                  {prioritizedTasks.slice(1, 6).map((task, index) => {
                    const urgencyBadge = getUrgencyBadge(task.urgencyScore);
                    const priorityLevel = getAIPriorityLevel(task.urgencyScore, task.position);
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group cursor-pointer relative"
                        onClick={() => startTask(task)}
                        style={{
                          borderLeftWidth: '4px',
                          borderLeftColor: 
                            priorityLevel === 'critical' ? '#ef4444' :
                            priorityLevel === 'high' ? '#f97316' :
                            priorityLevel === 'medium' ? '#eab308' : '#22c55e'
                        }}
                      >
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-purple-100 to-teal-100 text-sm font-bold text-purple-700 shadow-sm">
                          {index + 2}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="font-medium text-gray-900 truncate">{task.title}</p>
                            <PriorityIndicator priority={priorityLevel} compact />
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {task.aiReason}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {task.estimated_minutes || 30}m
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
                        </div>
                      </motion.div>
                    );
                  })}
                  
                  {prioritizedTasks.length > 6 && (
                    <p className="text-xs text-gray-400 text-center pt-2">
                      +{prioritizedTasks.length - 6} more tasks
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}