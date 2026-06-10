import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, Minus, Flame } from "lucide-react";
import { format, subDays, isAfter, isBefore } from "date-fns";

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40 p-3 text-center">
      <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === "completed") return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">Completed</Badge>;
  if (status === "in_progress") return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">In progress</Badge>;
  return <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-xs">Not started</Badge>;
}

export default function ClientProgressModal({ client, open, onClose, onGenerateReport }) {
  const [tasks, setTasks] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);

  const hasData = !!client?.client_user_id;

  useEffect(() => {
    if (!open || !client || !hasData) return;
    setLoading(true);
    Promise.all([
      base44.entities.Task.filter({ created_by_id: client.client_user_id }, "-created_date", 20),
      base44.entities.UserProgress.filter({ user_id: client.client_user_id }),
    ]).then(([fetchedTasks, progressList]) => {
      setTasks(fetchedTasks || []);
      setProgress(progressList?.[0] || null);
    }).finally(() => setLoading(false));
  }, [open, client]);

  if (!client) return null;

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const sixtyDaysAgo = subDays(now, 60);

  const thisMonthTasks = tasks.filter(t => isAfter(new Date(t.created_date), thirtyDaysAgo));
  const lastMonthTasks = tasks.filter(t => {
    const d = new Date(t.created_date);
    return isAfter(d, sixtyDaysAgo) && isBefore(d, thirtyDaysAgo);
  });

  const thisMonthInitiated = thisMonthTasks.length;
  const thisMonthCompleted = thisMonthTasks.filter(t => t.status === "completed").length;
  const completionRate = thisMonthInitiated > 0 ? Math.round((thisMonthCompleted / thisMonthInitiated) * 100) : 0;
  const currentStreak = progress?.current_streak ?? 0;
  const lastMonthInitiated = lastMonthTasks.length;

  // Best time of day from ALL completed tasks
  const buckets = { morning: 0, afternoon: 0, evening: 0 };
  tasks.filter(t => t.status === "completed" && t.updated_date).forEach(t => {
    const h = new Date(t.updated_date).getHours();
    if (h >= 6 && h < 12) buckets.morning++;
    else if (h >= 12 && h < 17) buckets.afternoon++;
    else if (h >= 17 && h < 21) buckets.evening++;
  });
  const maxBucket = Math.max(...Object.values(buckets), 1);

  const name = client.client_display_name || "Client";
  const trendUp = thisMonthInitiated > lastMonthInitiated;
  const trendEqual = thisMonthInitiated === lastMonthInitiated;

  const recentTasks = tasks.slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900/40">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100 text-base font-semibold">
            {name} — Progress Overview
          </DialogTitle>
        </DialogHeader>

        {!hasData ? (
          <p className="text-center text-amber-600 dark:text-amber-400 py-12 text-sm px-2">
            Unable to load progress — client data is incomplete. Please ask the client to reconnect.
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 py-12 text-sm">No task data yet for this client.</p>
        ) : (
          <div className="space-y-5 pt-1">

            {/* Section 1 — Snapshot */}
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Tasks this month" value={thisMonthInitiated} />
              <StatCard label="Completed" value={thisMonthCompleted} />
              <StatCard label="Streak" value={`${currentStreak}d`} />
              <StatCard label="Rate" value={`${completionRate}%`} />
            </div>

            {/* Section 2 — Trend */}
            <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
              trendEqual
                ? "bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400"
                : trendUp
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                  : "bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400"
            }`}>
              {trendUp ? <TrendingUp className="w-4 h-4 shrink-0" /> : <Minus className="w-4 h-4 shrink-0" />}
              <span>
                This month <strong>{name}</strong> initiated <strong>{thisMonthInitiated}</strong> tasks
                {" "}compared to <strong>{lastMonthInitiated}</strong> last month.
              </span>
            </div>

            {/* Section 3 — Best time of day */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Best time of day</p>
              <div className="space-y-2">
                {[["Morning", buckets.morning], ["Afternoon", buckets.afternoon], ["Evening", buckets.evening]].map(([label, count]) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="w-20 text-xs text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
                    <div className="flex-1 bg-purple-100 dark:bg-purple-900/20 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-purple-500 dark:bg-purple-400 rounded-full transition-all"
                        style={{ width: `${Math.round((count / maxBucket) * 100)}%` }}
                      />
                    </div>
                    <span className="w-5 text-right text-xs text-gray-400">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4 — Recent tasks */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Recent Tasks</p>
              <div className="space-y-1.5">
                {recentTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{task.title}</span>
                    <span className="text-xs text-gray-400 shrink-0">{format(new Date(task.created_date), "d MMM")}</span>
                    <StatusBadge status={task.status} />
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Report button */}
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => { onGenerateReport(); onClose(); }}
            >
              Generate Report
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}