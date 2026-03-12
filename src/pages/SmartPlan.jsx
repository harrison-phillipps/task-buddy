import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, CalendarPlus, Clock, Target, Zap, RefreshCw, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import ScheduleBlock from "@/components/smartplan/ScheduleBlock";
import CalendarConnectionStatus from "@/components/calendar/CalendarConnectionStatus";

export default function SmartPlan() {
  const [tasks, setTasks] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [addedKeys, setAddedKeys] = useState(new Set());
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [error, setError] = useState(null);
  const [isAddingAll, setIsAddingAll] = useState(false);

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      return base44.entities.Task.filter({ created_by: user.email });
    }).then(all => {
      setTasks(all.filter(t => t.status !== "completed").slice(0, 25));
    }).catch(console.error);
  }, []);

  const handleCalendarSync = async () => {
    setIsSyncing(true);
    const provider = currentUser?.calendar_provider || "google";
    const fnName = provider === "outlook" ? "fetchOutlookCalendarEvents" : "fetchCalendarEvents";
    try {
      const res = await base44.functions.invoke(fnName, {});
      if (res.data?.success) {
        setCurrentUser(u => ({ ...u, calendar_connected: true, calendar_provider: provider }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const blockKey = (block) => `${block.start_time}|${block.title}`;

  const generatePlan = async () => {
    setIsGenerating(true);
    setSchedule(null);
    setAddedKeys(new Set());
    setError(null);

    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const existingEvents = await base44.entities.CalendarEvent.filter({ start_date: today }).catch(() => []);

      const taskSummary = tasks.map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority || "medium",
        difficulty: t.difficulty || "medium",
        estimated_minutes: t.estimated_minutes || 30,
        due_date: t.due_date || null,
        energy_level_needed: t.energy_level_needed || "medium",
        category: t.category || "other",
      }));

      const existingSummary = existingEvents.map(e => ({
        title: e.title,
        start_time: e.start_time,
        end_time: e.end_time,
      }));

      const prompt = `You are an expert productivity coach. Create an optimized daily schedule for today: ${format(new Date(), "EEEE, MMMM d, yyyy")}.

Work hours: ${workStart} to ${workEnd}
Current time: ${format(new Date(), "HH:mm")}

Outstanding tasks (sorted by priority):
${JSON.stringify(taskSummary, null, 2)}

Already scheduled today (do NOT overlap these):
${JSON.stringify(existingSummary, null, 2)}

Scheduling rules:
- Start scheduling from the current time (skip past slots)
- Schedule urgent/high priority tasks first
- Add 10-minute break between every 2 focus blocks
- Include a 30-minute lunch break around 12:00
- High difficulty tasks → schedule when energy is peak (morning)
- Low difficulty tasks → schedule after lunch
- Each focus block: 25-90 minutes max
- Don't schedule past work end time
- Only schedule tasks that realistically fit today
- Do NOT overlap with already scheduled events

For each block include a short, specific "reason" (1 sentence) explaining WHY this task is placed at that time.

Return JSON:
{
  "summary": "2-3 sentence overview of today's plan and key insights",
  "total_tasks": <number of tasks scheduled>,
  "total_focus_hours": <total focus time in hours, 1 decimal>,
  "schedule": [
    {
      "task_id": "<task id or null>",
      "title": "<task title or 'Break' or 'Lunch Break'>",
      "type": "<focus|break|lunch>",
      "start_time": "<HH:MM>",
      "end_time": "<HH:MM>",
      "duration_minutes": <number>,
      "reason": "<why this slot>",
      "priority": "<urgent|high|medium|low or null>",
      "category": "<category or null>"
    }
  ]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            total_tasks: { type: "number" },
            total_focus_hours: { type: "number" },
            schedule: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task_id: { type: "string" },
                  title: { type: "string" },
                  type: { type: "string" },
                  start_time: { type: "string" },
                  end_time: { type: "string" },
                  duration_minutes: { type: "number" },
                  reason: { type: "string" },
                  priority: { type: "string" },
                  category: { type: "string" },
                }
              }
            }
          }
        }
      });

      setSchedule(result);
    } catch (e) {
      console.error(e);
      setError("Failed to generate your plan. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const addToCalendar = async (block) => {
    const colorMap = { urgent: "#EF4444", high: "#F97316", medium: "#8B5CF6", low: "#3B82F6", break: "#22C55E", lunch: "#F59E0B" };
    const color = block.type === "break" ? colorMap.break : block.type === "lunch" ? colorMap.lunch : (colorMap[block.priority] || colorMap.medium);

    await base44.entities.CalendarEvent.create({
      title: block.title,
      description: block.reason || "",
      start_date: format(new Date(), "yyyy-MM-dd"),
      start_time: block.start_time,
      end_time: block.end_time,
      duration_minutes: block.duration_minutes,
      source: "manual",
      task_id: block.task_id || undefined,
      is_focus_block: block.type === "focus",
      color,
    });
    setAddedKeys(prev => new Set([...prev, blockKey(block)]));
  };

  const addAllFocusBlocks = async () => {
    if (!schedule) return;
    setIsAddingAll(true);
    const focusBlocks = schedule.schedule.filter(b => b.type === "focus" && !addedKeys.has(blockKey(b)));
    for (const block of focusBlocks) {
      await addToCalendar(block);
    }
    setIsAddingAll(false);
  };

  const focusBlocksRemaining = schedule
    ? schedule.schedule.filter(b => b.type === "focus" && !addedKeys.has(blockKey(b))).length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-teal-50 dark:from-[#1a1025] dark:via-[#0f1a1f] dark:to-[#0d1220] p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Smart Plan</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{format(new Date(), "EEEE, MMMM d")}</p>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-3">
            AI-powered daily schedule based on your {tasks.length} outstanding task{tasks.length !== 1 ? "s" : ""}, deadlines, and energy levels.
          </p>
        </div>

        {/* Calendar connection status */}
        <div className="mb-4">
          <CalendarConnectionStatus
            currentUser={currentUser}
            onSync={handleCalendarSync}
            isSyncing={isSyncing}
          />
        </div>

        {/* Settings row */}
        <Card className="mb-6 border-purple-100 dark:border-gray-700 dark:bg-gray-800/60">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Clock className="w-4 h-4 text-purple-500" />
                <span className="font-medium">Work hours:</span>
              </div>
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="time"
                  value={workStart}
                  onChange={e => setWorkStart(e.target.value)}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <span className="text-gray-400">→</span>
                <input
                  type="time"
                  value={workEnd}
                  onChange={e => setWorkEnd(e.target.value)}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <Button
                onClick={generatePlan}
                disabled={isGenerating || tasks.length === 0}
                className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-medium gap-2 shadow-md"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Planning…</>
                ) : schedule ? (
                  <><RefreshCw className="w-4 h-4" /> Regenerate</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate My Day</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-teal-100 dark:from-purple-900/40 dark:to-teal-900/40 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-purple-500 animate-pulse" />
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Crafting your perfect day…</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs">Analyzing tasks, deadlines & energy levels</p>
          </div>
        )}

        {/* Empty state */}
        {!isGenerating && !schedule && !error && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-teal-100 dark:from-purple-900/30 dark:to-teal-900/30 flex items-center justify-center">
              <CalendarDays className="w-7 h-7 text-purple-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">Ready to plan your day?</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {tasks.length === 0
                  ? "No outstanding tasks found — you're all caught up! 🎉"
                  : `Hit "Generate My Day" and let AI schedule your ${tasks.length} tasks optimally.`}
              </p>
            </div>
          </div>
        )}

        {/* Schedule */}
        <AnimatePresence>
          {schedule && !isGenerating && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* Summary card */}
              <Card className="mb-4 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-teal-50 dark:from-purple-950/40 dark:to-teal-950/40">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{schedule.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 mb-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 px-3 py-1.5 rounded-full">
                      <Target className="w-3.5 h-3.5" />
                      {schedule.total_tasks} tasks scheduled
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/40 px-3 py-1.5 rounded-full">
                      <Clock className="w-3.5 h-3.5" />
                      {schedule.total_focus_hours}h focus time
                    </div>
                  </div>

                  {focusBlocksRemaining > 0 && (
                    <Button
                      onClick={addAllFocusBlocks}
                      disabled={isAddingAll}
                      className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white gap-2 font-medium"
                    >
                      {isAddingAll ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Blocking time…</>
                      ) : (
                        <><CalendarPlus className="w-4 h-4" /> Add All {focusBlocksRemaining} Focus Blocks to Calendar</>
                      )}
                    </Button>
                  )}
                  {focusBlocksRemaining === 0 && addedKeys.size > 0 && (
                    <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium py-2">
                      <Zap className="w-4 h-4" />
                      All focus blocks added to calendar!
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timeline */}
              <div className="space-y-2">
                {schedule.schedule.map((block, i) => (
                  <ScheduleBlock
                    key={`${block.start_time}-${i}`}
                    block={block}
                    index={i}
                    isAdded={addedKeys.has(blockKey(block))}
                    onAdd={addToCalendar}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}