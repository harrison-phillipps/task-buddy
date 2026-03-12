import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Calendar, Clock, CheckCircle2, ChevronLeft, ChevronRight, AlertCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format, addDays, subDays } from "date-fns";

const PRIORITY_COLORS = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

const CATEGORY_EMOJI = {
  work: "💼", personal: "🏠", health: "💪", creative: "🎨",
  learning: "📚", household: "🧹", other: "📋",
};

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return format(new Date(y, m - 1, d), 'EEEE, MMMM d');
}

function adjustDate(dateStr, delta) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const result = delta > 0 ? addDays(new Date(y, m - 1, d), delta) : subDays(new Date(y, m - 1, d), Math.abs(delta));
  return format(result, 'yyyy-MM-dd');
}

export default function CalendarGapFiller() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [filling, setFilling] = useState({});   // gapIndex -> taskId -> true/false
  const [filled, setFilled] = useState({});      // gapIndex -> [taskIds]

  const scan = async () => {
    setLoading(true);
    setData(null);
    setFilling({});
    setFilled({});
    try {
      const res = await base44.functions.invoke('findCalendarGaps', { date, work_start: 9, work_end: 18, min_gap_minutes: 30 });
      if (!res.data?.success) {
        toast.error(res.data?.error || 'Failed to scan calendar');
      } else {
        setData(res.data);
        if (res.data.gaps.length === 0) {
          toast.success('No free gaps found — your day is fully booked!');
        } else {
          toast.success(`Found ${res.data.gaps.length} free slot${res.data.gaps.length > 1 ? 's' : ''} on your calendar`);
        }
      }
    } catch (e) {
      toast.error('Something went wrong scanning your calendar');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fillGap = async (gapIndex, taskId) => {
    const gap = data.gaps[gapIndex];
    const task = data.tasks.find(t => t.id === taskId);
    if (!task || !gap) return;

    setFilling(prev => ({ ...prev, [`${gapIndex}-${taskId}`]: true }));
    try {
      await base44.entities.CalendarEvent.create({
        title: task.title,
        start_date: date,
        start_time: gap.start_time,
        end_time: calcEndTime(gap.start_time, task.estimated_minutes),
        duration_minutes: task.estimated_minutes,
        source: 'task',
        task_id: taskId,
        is_focus_block: true,
        color: '#8B5CF6',
      });
      setFilled(prev => ({
        ...prev,
        [gapIndex]: [...(prev[gapIndex] || []), taskId],
      }));
      toast.success(`"${task.title}" scheduled for ${gap.start_time}!`);
    } catch (e) {
      toast.error('Failed to schedule task');
      console.error(e);
    } finally {
      setFilling(prev => ({ ...prev, [`${gapIndex}-${taskId}`]: false }));
    }
  };

  const fillAll = async () => {
    if (!data) return;
    let count = 0;
    for (const s of data.suggestions) {
      const gapIdx = s.gap_index;
      const alreadyFilled = filled[gapIdx] || [];
      const taskId = s.task_ids.find(id => !alreadyFilled.includes(id));
      if (taskId) {
        await fillGap(gapIdx, taskId);
        count++;
        await new Promise(r => setTimeout(r, 400));
      }
    }
    if (count === 0) toast.info('All suggestions already filled');
  };

  function calcEndTime(startTime, minutes) {
    const [h, m] = startTime.split(':').map(Number);
    const total = h * 60 + m + minutes;
    return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
  }

  const getSuggestionsForGap = (gapIndex) =>
    (data?.suggestions || []).find(s => s.gap_index === gapIndex);

  const getTask = (id) => data?.tasks?.find(t => t.id === id);

  const isTaskFilled = (gapIndex, taskId) => (filled[gapIndex] || []).includes(taskId);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
              Smart Gap Filler
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">Scan your calendar for free time, then auto-fill it with your most important tasks.</p>
        </motion.div>

        {/* Date picker + Scan */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-100 dark:border-gray-700">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-2 flex-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDate(d => adjustDate(d, -1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1 text-center">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{formatDate(date)}</p>
                  {date === today && <p className="text-xs text-purple-500">Today</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDate(d => adjustDate(d, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button
                onClick={scan}
                disabled={loading}
                className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold px-6 w-full sm:w-auto"
              >
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning...</> : <><Calendar className="w-4 h-4 mr-2" />Scan Calendar</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* No calendar connected */}
        {data && !data.provider && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
            <CardContent className="pt-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
              <p className="text-orange-700 dark:text-orange-300 text-sm">No calendar connected. Connect Google or Outlook in <strong>Integrations</strong> first.</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <AnimatePresence>
          {data?.success && data.gaps.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {/* Summary bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200">
                    {data.events.length} events today
                  </Badge>
                  <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200">
                    {data.gaps.length} free slots
                  </Badge>
                  <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-gray-200">
                    via {data.provider === 'google' ? '🗓 Google' : '📅 Outlook'}
                  </Badge>
                </div>
                {data.suggestions.length > 0 && (
                  <Button
                    onClick={fillAll}
                    size="sm"
                    className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto-Fill All Gaps
                  </Button>
                )}
              </div>

              {/* Gap cards */}
              {data.gaps.map((gap, gapIdx) => {
                const suggestion = getSuggestionsForGap(gapIdx);
                const suggestedTasks = (suggestion?.task_ids || []).map(getTask).filter(Boolean);
                const filledIds = filled[gapIdx] || [];

                return (
                  <motion.div
                    key={gapIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: gapIdx * 0.08 }}
                  >
                    <Card className="bg-white/90 dark:bg-gray-800/90 border-purple-100 dark:border-gray-700 overflow-hidden">
                      {/* Gap header */}
                      <div className="bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-purple-500" />
                          <span className="font-semibold text-gray-800 dark:text-gray-100">{gap.start_time} – {gap.end_time}</span>
                          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-xs">
                            {gap.duration_minutes} min free
                          </Badge>
                        </div>
                        {filledIds.length > 0 && (
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {filledIds.length} scheduled
                          </div>
                        )}
                      </div>

                      <CardContent className="pt-4 pb-4 space-y-3">
                        {suggestedTasks.length > 0 ? (
                          <>
                            {suggestion?.reasoning && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 italic flex gap-1 items-start">
                                <Sparkles className="w-3 h-3 mt-0.5 text-purple-400 flex-shrink-0" />
                                {suggestion.reasoning}
                              </p>
                            )}
                            <div className="space-y-2">
                              {suggestedTasks.map((task) => {
                                const taskFilled = isTaskFilled(gapIdx, task.id);
                                const isLoading = filling[`${gapIdx}-${task.id}`];
                                const fits = task.estimated_minutes <= gap.duration_minutes;

                                return (
                                  <div
                                    key={task.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                      taskFilled
                                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                                    }`}
                                  >
                                    <span className="text-lg flex-shrink-0">{CATEGORY_EMOJI[task.category] || '📋'}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className={`font-medium text-sm truncate ${taskFilled ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                                        {task.title}
                                      </p>
                                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        <span className="text-xs text-gray-500">{task.estimated_minutes} min</span>
                                        <Badge className={`text-xs px-1.5 py-0 border ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
                                          {task.priority}
                                        </Badge>
                                        {!fits && <span className="text-xs text-orange-500">⚠ may not fit</span>}
                                      </div>
                                    </div>
                                    {taskFilled ? (
                                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    ) : (
                                      <Button
                                        size="sm"
                                        disabled={isLoading}
                                        onClick={() => fillGap(gapIdx, task.id)}
                                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-7 px-3 flex-shrink-0"
                                      >
                                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Schedule'}
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-2">
                            No tasks found that fit this slot. Add tasks or reduce their estimated time.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {data?.success && data.gaps.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="bg-white/80 dark:bg-gray-800/80 border-green-200 dark:border-green-700">
                <CardContent className="pt-8 pb-8 text-center space-y-2">
                  <div className="text-5xl">📅</div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">Your day is fully packed!</p>
                  <p className="text-sm text-gray-500">No free slots of 30+ minutes found in your work hours (9am–6pm).</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Events timeline (compact) */}
        {data?.success && data.events.length > 0 && (
          <Card className="bg-white/70 dark:bg-gray-800/70 border-gray-100 dark:border-gray-700">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Today's Events</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-1.5">
              {data.events.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-gray-400 w-24 flex-shrink-0 font-mono text-xs">{ev.start_time} – {ev.end_time}</span>
                  <span className="text-gray-700 dark:text-gray-300 truncate">{ev.title}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}