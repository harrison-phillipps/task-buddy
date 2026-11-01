import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, Minus } from "lucide-react";

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40 p-3 text-center">
      <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

export default function ClientProgressModal({ client, open, onClose, onGenerateReport }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const hasData = !!client?.client_user_id;

  useEffect(() => {
    if (!open || !client || !hasData) return;
    setLoading(true);
    // The server confirms this client is on the clinician's list, then returns
    // aggregates only — no task titles, notes or ids leave the client's account.
    base44.functions.invoke("getClientProgress", {
      client_user_id: client.client_user_id,
      tz_offset_minutes: -new Date().getTimezoneOffset(),
    })
      .then((res) => setSummary(res.data?.error ? null : res.data || null))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [open, client]);

  if (!client) return null;

  const thisMonthInitiated = summary?.tasks_initiated_this_month ?? 0;
  const thisMonthCompleted = summary?.tasks_completed_this_month ?? 0;
  const completionRate = summary?.completion_rate ?? 0;
  const currentStreak = summary?.current_streak ?? 0;
  const lastMonthInitiated = summary?.tasks_initiated_last_month ?? 0;
  const buckets = summary?.best_time_of_day || { morning: 0, afternoon: 0, evening: 0 };
  const maxBucket = Math.max(...Object.values(buckets), 1);
  const hasTasks = (summary?.tasks_in_window ?? 0) > 0;

  const name = client.client_display_name || "Client";
  const trendUp = thisMonthInitiated > lastMonthInitiated;
  const trendEqual = thisMonthInitiated === lastMonthInitiated;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-x-hidden overflow-y-auto bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900/40">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100 text-base font-semibold pr-6">
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
        ) : !hasTasks ? (
          <p className="text-center text-gray-400 dark:text-gray-500 py-12 text-sm">No task data yet for this client.</p>
        ) : (
          <div className="space-y-5 pt-1 w-full overflow-x-hidden">

            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Tasks this month" value={thisMonthInitiated} />
              <StatCard label="Completed" value={thisMonthCompleted} />
              <StatCard label="Streak" value={`${currentStreak}d`} />
              <StatCard label="Completion rate" value={`${completionRate}%`} />
            </div>

            <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm w-full ${
              trendEqual
                ? "bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400"
                : trendUp
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                  : "bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400"
            }`}>
              {trendUp ? <TrendingUp className="w-4 h-4 shrink-0 mt-0.5" /> : <Minus className="w-4 h-4 shrink-0 mt-0.5" />}
              <span className="flex-1 min-w-0 break-words">
                This month <strong>{name}</strong> initiated <strong>{thisMonthInitiated}</strong> tasks compared to <strong>{lastMonthInitiated}</strong> last month.
              </span>
            </div>

            <div className="w-full">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Best time of day</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2">Approximate — based on when completed tasks were last updated.</p>
              <div className="space-y-2">
                {[["Morning", buckets.morning], ["Afternoon", buckets.afternoon], ["Evening", buckets.evening]].map(([label, count]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="w-16 text-xs text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
                    <div className="flex-1 bg-purple-100 dark:bg-purple-900/20 rounded-full h-2 overflow-hidden min-w-0">
                      <div
                        className="h-full bg-purple-500 dark:bg-purple-400 rounded-full transition-all"
                        style={{ width: `${Math.round((count / maxBucket) * 100)}%` }}
                      />
                    </div>
                    <span className="w-4 text-right text-xs text-gray-400 shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>

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