import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, CheckCircle, Zap, BarChart2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";

export default function SessionMetrics({ sessions = [], currentSessionMinutes = 0, isActive = false }) {
  const stats = useMemo(() => {
    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((s, x) => s + (x.duration_minutes || 0), 0) + currentSessionMinutes;
    const completedSessions = sessions.filter(s => s.completed).length;
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    // Mood distribution
    const moodCounts = {};
    sessions.forEach(s => {
      if (s.mood_after) moodCounts[s.mood_after] = (moodCounts[s.mood_after] || 0) + 1;
    });

    // Sessions by day (last 7 days)
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const byDay = Array(7).fill(0);
    const now = new Date();
    sessions.forEach(s => {
      if (!s.created_date) return;
      const d = new Date(s.created_date);
      const diff = Math.floor((now - d) / 86400000);
      if (diff >= 0 && diff < 7) byDay[6 - diff] += s.duration_minutes || 0;
    });
    const chartData = byDay.map((minutes, i) => ({
      day: dayLabels[(now.getDay() - 6 + i + 7) % 7],
      minutes,
    }));

    // Avg session length
    const avgMinutes = totalSessions > 0 ? Math.round(totalMinutes / (totalSessions + (currentSessionMinutes > 0 ? 1 : 0))) : 0;

    // Favourite technique
    const techniques = {};
    sessions.forEach(s => { if (s.focus_technique) techniques[s.focus_technique] = (techniques[s.focus_technique] || 0) + 1; });
    const favTechnique = Object.keys(techniques).sort((a, b) => techniques[b] - techniques[a])[0] || "—";

    return { totalSessions, totalMinutes, completedSessions, completionRate, chartData, avgMinutes, favTechnique, moodCounts };
  }, [sessions, currentSessionMinutes]);

  const hours = Math.floor(stats.totalMinutes / 60);
  const mins = stats.totalMinutes % 60;

  return (
    <div className="space-y-4">
      {/* Live indicator */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl px-4 py-2"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">Session in progress · +{currentSessionMinutes} min</span>
        </motion.div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Clock, label: "Total Focus Time", value: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`, color: "text-purple-600" },
          { icon: CheckCircle, label: "Sessions Done", value: stats.totalSessions, color: "text-green-600" },
          { icon: TrendingUp, label: "Completion Rate", value: `${stats.completionRate}%`, color: "text-teal-600" },
          { icon: Zap, label: "Avg Length", value: `${stats.avgMinutes}m`, color: "text-orange-600" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Completion progress */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">Completion Rate</span>
          <span className="font-bold text-teal-600">{stats.completionRate}%</span>
        </div>
        <Progress value={stats.completionRate} className="h-2" />
        <p className="text-xs text-gray-500">{stats.completedSessions} of {stats.totalSessions} sessions completed</p>
      </div>

      {/* 7-day chart */}
      {stats.chartData.some(d => d.minutes > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Last 7 Days (minutes)</span>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={stats.chartData} barSize={18}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v) => [`${v} min`, "Focus"]} contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                {stats.chartData.map((_, i) => (
                  <Cell key={i} fill={i === 6 && isActive ? "#14B8A6" : "#8B5CF6"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Favourite technique badge */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <span>Favourite technique:</span>
        <Badge variant="secondary" className="capitalize">{stats.favTechnique}</Badge>
      </div>
    </div>
  );
}