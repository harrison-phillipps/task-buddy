import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { Clock, Zap, AlertTriangle, TrendingUp, Brain, Sun, Moon, Sunset } from "lucide-react";

/**
 * Analyses focus session history to:
 *   1. Build an hourly productivity heatmap
 *   2. Classify each hour as Peak / Normal / Low-Energy
 *   3. Highlight the user's current hour if it's a low-energy window
 */
export default function PeakProductivityDashboard({ focusSessions }) {
  const currentHour = new Date().getHours();

  // ── Build hourly stats from session history ─────────────────────────────
  const hourlyStats = useMemo(() => {
    return Array.from({ length: 24 }, (_, hour) => {
      const matching = focusSessions.filter(s => {
        if (!s.created_date) return false;
        return new Date(s.created_date).getHours() === hour;
      });

      const totalMinutes = matching.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
      const avgDuration = matching.length > 0 ? totalMinutes / matching.length : 0;
      // Sessions that were "completed" are higher quality
      const completedCount = matching.filter(s => s.completed).length;
      const completionRate = matching.length > 0 ? completedCount / matching.length : 0;
      // Weighted score: session count + duration weight + completion quality
      const score = matching.length * 10 + avgDuration * 0.5 + completionRate * 20;

      return {
        hour,
        label: hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`,
        minutes: totalMinutes,
        sessions: matching.length,
        avgDuration: Math.round(avgDuration),
        completionRate: Math.round(completionRate * 100),
        score,
      };
    });
  }, [focusSessions]);

  // ── Energy classification ───────────────────────────────────────────────
  const { peakThreshold, lowThreshold, maxScore, classified, peakHours, lowHours } = useMemo(() => {
    const activeHours = hourlyStats.filter(h => h.sessions > 0);
    if (activeHours.length === 0) {
      return { peakThreshold: 0, lowThreshold: 0, maxScore: 0, classified: hourlyStats, peakHours: [], lowHours: [] };
    }
    const scores = activeHours.map(h => h.score);
    const maxScore = Math.max(...scores);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const peakThreshold = avgScore + (maxScore - avgScore) * 0.5;
    const lowThreshold = avgScore * 0.4;

    const classified = hourlyStats.map(h => ({
      ...h,
      zone: h.sessions === 0
        ? 'inactive'
        : h.score >= peakThreshold
          ? 'peak'
          : h.score <= lowThreshold
            ? 'low'
            : 'normal',
    }));

    const peakHours = classified.filter(h => h.zone === 'peak').sort((a, b) => b.score - a.score);
    const lowHours = classified.filter(h => h.zone === 'low').sort((a, b) => a.score - b.score);

    return { peakThreshold, lowThreshold, maxScore, classified, peakHours, lowHours };
  }, [hourlyStats]);

  // ── Relevant display range (6am – 11pm) ────────────────────────────────
  const displayHours = classified.filter(h => h.hour >= 6 && h.hour <= 23);

  // ── Bar colour per zone ─────────────────────────────────────────────────
  const barColor = (h) => {
    if (h.hour === currentHour) return '#F59E0B'; // amber = "now"
    if (h.zone === 'peak') return '#8B5CF6';
    if (h.zone === 'low') return '#FCA5A5';
    if (h.zone === 'inactive') return '#E5E7EB';
    return '#C4B5FD';
  };

  // ── Is the current hour low-energy? ────────────────────────────────────
  const currentHourData = classified[currentHour];
  const isCurrentLowEnergy = currentHourData?.zone === 'low';
  const isCurrentPeak = currentHourData?.zone === 'peak';

  // ── Time-of-day helpers ─────────────────────────────────────────────────
  const timeOfDay = (hour) => {
    if (hour < 12) return { label: 'Morning', Icon: Sun };
    if (hour < 17) return { label: 'Afternoon', Icon: Sunset };
    return { label: 'Evening', Icon: Moon };
  };

  const hasSessions = focusSessions.length > 0;

  // ── Custom tooltip ──────────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 border border-purple-100 dark:border-gray-700 rounded-xl shadow-lg p-3 text-xs">
        <p className="font-bold text-gray-800 dark:text-gray-100 mb-1">{d.label}</p>
        <p className="text-gray-600 dark:text-gray-300">{d.sessions} session{d.sessions !== 1 ? 's' : ''}</p>
        <p className="text-gray-600 dark:text-gray-300">{d.minutes} min total</p>
        {d.avgDuration > 0 && <p className="text-gray-600 dark:text-gray-300">Avg {d.avgDuration} min/session</p>}
        {d.sessions > 0 && (
          <Badge
            className={`mt-1 text-[10px] ${
              d.zone === 'peak' ? 'bg-purple-100 text-purple-700' :
              d.zone === 'low' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'
            }`}
          >
            {d.zone === 'peak' ? '⚡ Peak' : d.zone === 'low' ? '😴 Low Energy' : 'Normal'}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Current Hour Alert ─────────────────────────────────────────── */}
      {hasSessions && (isCurrentLowEnergy || isCurrentPeak) && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
          isCurrentLowEnergy
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
            : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700'
        }`}>
          {isCurrentLowEnergy ? (
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          ) : (
            <Zap className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`font-semibold text-sm ${isCurrentLowEnergy ? 'text-red-700 dark:text-red-300' : 'text-purple-700 dark:text-purple-300'}`}>
              {isCurrentLowEnergy
                ? `⚠️ Low cognitive energy window right now (${currentHourData.label})`
                : `⚡ You're in a peak productivity window! (${currentHourData.label})`}
            </p>
            <p className={`text-xs mt-0.5 ${isCurrentLowEnergy ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'}`}>
              {isCurrentLowEnergy
                ? 'Based on your history, focus tends to dip at this time. Consider scheduling lighter tasks or taking a break.'
                : 'Your history shows high focus at this hour — great time to tackle demanding work!'}
            </p>
          </div>
        </div>
      )}

      {/* ── Main Chart Card ────────────────────────────────────────────── */}
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-100 dark:border-gray-700">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="w-5 h-5 text-purple-600" />
              Peak Productivity Hours
            </CardTitle>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-purple-500 inline-block" /> Peak</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-purple-200 inline-block" /> Normal</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-200 inline-block" /> Low Energy</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Now</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!hasSessions ? (
            <div className="h-64 flex items-center justify-center text-center text-gray-400 text-sm">
              <div>
                <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p>Complete a few focus sessions to see your peak productivity hours</p>
              </div>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayHours} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9 }}
                    tickLine={false}
                    interval={1}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `${v}m`}
                    width={30}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {/* Reference line at current hour */}
                  <ReferenceLine
                    x={currentHourData?.label}
                    stroke="#F59E0B"
                    strokeDasharray="4 2"
                    strokeWidth={1.5}
                  />
                  <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                    {displayHours.map((entry, i) => (
                      <Cell key={i} fill={barColor(entry)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Insights Row ──────────────────────────────────────────────── */}
      {hasSessions && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Peak windows */}
          <Card className="bg-white/80 dark:bg-gray-800/80 border-purple-100 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                Your Peak Windows
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {peakHours.length === 0 ? (
                <p className="text-xs text-gray-400">Not enough data yet — keep logging sessions!</p>
              ) : (
                peakHours.slice(0, 4).map(h => {
                  const { label: todLabel, Icon: TodIcon } = timeOfDay(h.hour);
                  return (
                    <div key={h.hour} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TodIcon className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{h.label}</span>
                        <span className="text-xs text-gray-400">{todLabel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{h.sessions} sessions</span>
                        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-[10px]">
                          ⚡ Peak
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Low-energy warnings */}
          <Card className="bg-white/80 dark:bg-gray-800/80 border-red-100 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Low Cognitive Energy Zones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lowHours.length === 0 ? (
                <p className="text-xs text-gray-400">No low-energy patterns detected yet.</p>
              ) : (
                lowHours.slice(0, 4).map(h => {
                  const { label: todLabel, Icon: TodIcon } = timeOfDay(h.hour);
                  return (
                    <div key={h.hour} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TodIcon className="w-4 h-4 text-red-300" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{h.label}</span>
                        <span className="text-xs text-gray-400">{todLabel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{h.sessions} sessions</span>
                        <Badge className="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300 text-[10px]">
                          😴 Low
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
              {lowHours.length > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-700">
                  💡 Schedule admin tasks, emails, or breaks during these windows.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}