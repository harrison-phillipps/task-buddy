import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, Clock, Zap, RefreshCw, ChevronDown, ChevronUp, Sun, Sunset, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ENERGY_COLORS = {
  high:   { bg: "bg-red-100 dark:bg-red-900/30",    text: "text-red-700 dark:text-red-300",    label: "High Energy",   icon: "🔥" },
  medium: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300", label: "Medium Energy", icon: "⚡" },
  low:    { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", label: "Low Energy",    icon: "🌿" },
};

const TIME_OF_DAY_ICONS = { morning: Sun, afternoon: Sunset, evening: Moon };

export default function DailySchedulePlanner({ tasks = [], calendarEvents = [], userProgress }) {
  const [schedule, setSchedule] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [lastGenerated, setLastGenerated] = useState(null);

  const pendingTasks = tasks.filter(t => t.status !== "completed");
  const today = new Date().toISOString().split("T")[0];
  const todayEvents = calendarEvents.filter(e => e.start_date === today);

  const generateSchedule = async () => {
    setIsLoading(true);
    try {
      const taskSummary = pendingTasks.slice(0, 15).map(t => ({
        title: t.title,
        estimated_minutes: t.estimated_minutes || 30,
        energy_level_needed: t.energy_level_needed || "medium",
        priority: t.priority || "medium",
        difficulty: t.difficulty || "medium",
        due_date: t.due_date || null,
      }));

      const eventSummary = todayEvents.map(e => ({
        title: e.title,
        start_time: e.start_time,
        end_time: e.end_time,
        duration_minutes: e.duration_minutes,
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a productivity expert. Create an optimal daily schedule for today based on these tasks and calendar events.

TODAY'S CALENDAR EVENTS (already scheduled):
${eventSummary.length > 0 ? JSON.stringify(eventSummary, null, 2) : "No calendar events today."}

PENDING TASKS TO SCHEDULE:
${JSON.stringify(taskSummary, null, 2)}

USER LEVEL: ${userProgress?.level || 1}
TOTAL FOCUS SESSIONS: ${userProgress?.focus_sessions_completed || 0}

SCHEDULING RULES:
- Morning (7am-12pm): Best for HIGH energy tasks (deep work, complex problems)
- Afternoon (12pm-5pm): Best for MEDIUM energy tasks (meetings, routine work)
- Evening (5pm-9pm): Best for LOW energy tasks (admin, easy reviews)
- Respect existing calendar events — don't schedule tasks overlapping them
- Include short breaks between blocks (5-15 min)
- Limit total scheduled work to 6-8 hours max
- Prioritize urgent/high priority tasks first
- Group similar tasks together when possible

Return a schedule with time blocks. Each block must have a clear start time and the reason for scheduling it then.`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string", description: "1-2 sentence overview of the day's plan" },
            total_focus_hours: { type: "number" },
            time_blocks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  start_time: { type: "string", description: "e.g. 9:00 AM" },
                  end_time: { type: "string", description: "e.g. 10:30 AM" },
                  type: { type: "string", enum: ["task", "break", "calendar_event"] },
                  title: { type: "string" },
                  energy_level: { type: "string", enum: ["high", "medium", "low"] },
                  time_of_day: { type: "string", enum: ["morning", "afternoon", "evening"] },
                  reason: { type: "string", description: "Why this task is scheduled at this time" },
                  duration_minutes: { type: "number" },
                }
              }
            },
            tips: {
              type: "array",
              items: { type: "string" },
              description: "2-3 personalized tips for the day"
            }
          }
        }
      });

      setSchedule(result);
      setLastGenerated(new Date());
      setExpanded(true);
    } catch (error) {
      console.error("Schedule generation failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (pendingTasks.length === 0) return null;

  return (
    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-100 dark:border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-teal-500 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <span className="bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent font-bold">
              AI Daily Schedule
            </span>
            {todayEvents.length > 0 && (
              <Badge variant="outline" className="text-xs border-teal-200 text-teal-600">
                {todayEvents.length} event{todayEvents.length > 1 ? "s" : ""} today
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {schedule && (
              <button onClick={() => setExpanded(v => !v)} className="text-gray-400 hover:text-gray-600 p-1">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
            <Button
              onClick={generateSchedule}
              disabled={isLoading}
              size="sm"
              className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white gap-2"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {schedule ? "Regenerate" : "Plan My Day"}
            </Button>
          </div>
        </div>
        {!schedule && !isLoading && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Analyze your {pendingTasks.length} tasks{todayEvents.length > 0 ? ` and ${todayEvents.length} calendar events` : ""} to get an optimal schedule with energy-aware time blocks.
          </p>
        )}
      </CardHeader>

      <AnimatePresence>
        {isLoading && (
          <CardContent>
            <div className="flex items-center gap-3 py-6 justify-center text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin text-purple-500" />
              <span className="text-sm">Analyzing your tasks and calendar to build the perfect schedule…</span>
            </div>
          </CardContent>
        )}

        {schedule && expanded && !isLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <CardContent className="space-y-4">
              {/* Summary */}
              <div className="p-3 bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
                <p className="text-sm text-gray-700 dark:text-gray-300">{schedule.summary}</p>
                {schedule.total_focus_hours > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-purple-500" />
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                      {schedule.total_focus_hours}h of focused work planned
                    </span>
                  </div>
                )}
              </div>

              {/* Time Blocks */}
              <div className="space-y-2">
                {schedule.time_blocks?.map((block, idx) => {
                  if (block.type === "break") {
                    return (
                      <div key={idx} className="flex items-center gap-3 py-1 px-3 text-xs text-gray-400 dark:text-gray-500">
                        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                        <span>☕ {block.title || "Break"} ({block.duration_minutes} min)</span>
                        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                      </div>
                    );
                  }

                  const energy = ENERGY_COLORS[block.energy_level] || ENERGY_COLORS.medium;
                  const TimeIcon = TIME_OF_DAY_ICONS[block.time_of_day] || Sun;
                  const isCalEvent = block.type === "calendar_event";

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                        isCalEvent
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                          : `${energy.bg} border-transparent`
                      }`}
                    >
                      <div className="flex flex-col items-center min-w-[60px] text-center">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap">{block.start_time}</span>
                        <span className="text-xs text-gray-400">↓</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{block.end_time}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{block.title}</span>
                          {!isCalEvent && (
                            <span className="text-xs">{energy.icon}</span>
                          )}
                          {isCalEvent && (
                            <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">📅 Calendar</Badge>
                          )}
                        </div>
                        {block.reason && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{block.reason}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <TimeIcon className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">{block.duration_minutes}m</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Tips */}
              {schedule.tips?.length > 0 && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Today's Tips
                  </p>
                  {schedule.tips.map((tip, i) => (
                    <p key={i} className="text-xs text-gray-600 dark:text-gray-400 pl-4">• {tip}</p>
                  ))}
                </div>
              )}

              {lastGenerated && (
                <p className="text-xs text-gray-400 text-right">
                  Generated at {lastGenerated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}