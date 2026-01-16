import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, Calendar, Target, Loader2, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, addDays } from "date-fns";

export default function ProductivityForecasterBot({ tasks, sessions, userProgress }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [showBot, setShowBot] = useState(true);

  const analyzeTrends = async () => {
    setIsAnalyzing(true);
    try {
      // Calculate current week stats
      const now = new Date();
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);

      const thisWeekTasks = tasks.filter(t => {
        if (!t.created_date) return false;
        const createdDate = parseISO(t.created_date);
        return isWithinInterval(createdDate, { start: weekStart, end: weekEnd });
      });

      const thisWeekSessions = sessions.filter(s => {
        if (!s.created_date) return false;
        const sessionDate = parseISO(s.created_date);
        return isWithinInterval(sessionDate, { start: weekStart, end: weekEnd });
      });

      const upcomingDeadlines = tasks.filter(t => {
        if (!t.due_date || t.status === 'completed') return false;
        const dueDate = parseISO(t.due_date);
        const next7Days = addDays(now, 7);
        return isWithinInterval(dueDate, { start: now, end: next7Days });
      });

      const blockedTasks = tasks.filter(t => t.blocked_by?.length > 0 && t.status !== 'completed');
      const incompleteTasks = tasks.filter(t => t.status !== 'completed');
      const hardTasks = incompleteTasks.filter(t => t.difficulty === 'hard');

      const avgSessionTime = thisWeekSessions.length > 0 
        ? thisWeekSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / thisWeekSessions.length 
        : 0;

      const completionRate = thisWeekTasks.length > 0 
        ? (thisWeekTasks.filter(t => t.status === 'completed').length / thisWeekTasks.length) * 100 
        : 0;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You're a Productivity Forecaster Bot - an AI that predicts productivity bottlenecks and trends.

Current Week Analysis:
- Tasks created: ${thisWeekTasks.length}
- Focus sessions: ${thisWeekSessions.length}
- Average session time: ${Math.round(avgSessionTime)} minutes
- Completion rate: ${Math.round(completionRate)}%
- Upcoming deadlines (next 7 days): ${upcomingDeadlines.length}
- Blocked tasks: ${blockedTasks.length}
- Hard difficulty tasks pending: ${hardTasks.length}
- Current streak: ${userProgress?.current_streak || 0} days
- Total incomplete tasks: ${incompleteTasks.length}

Task breakdown by status:
- Not started: ${tasks.filter(t => t.status === 'not_started').length}
- In progress: ${tasks.filter(t => t.status === 'in_progress').length}
- Completed: ${tasks.filter(t => t.status === 'completed').length}

Based on these trends, provide:
1. Risk level (low/medium/high/critical)
2. Primary bottleneck prediction (what's most likely to cause problems)
3. One actionable recommendation to prevent the bottleneck
4. Estimated impact if recommendation is followed (low/medium/high)
5. Trend direction (improving/stable/declining)

Be specific and data-driven!`,
        response_json_schema: {
          type: "object",
          properties: {
            risk_level: { type: "string" },
            primary_bottleneck: { type: "string" },
            recommendation: { type: "string" },
            estimated_impact: { type: "string" },
            trend_direction: { type: "string" },
            insight_summary: { type: "string" }
          }
        }
      });

      setForecast({
        ...result,
        stats: {
          upcomingDeadlines: upcomingDeadlines.length,
          blockedTasks: blockedTasks.length,
          hardTasks: hardTasks.length,
          completionRate: Math.round(completionRate)
        }
      });
    } catch (error) {
      console.error("Forecaster bot error:", error);
    }
    setIsAnalyzing(false);
  };

  useEffect(() => {
    if (tasks?.length > 5 && !forecast) {
      analyzeTrends();
    }
  }, []);

  if (!showBot || !tasks?.length) return null;

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'critical': return 'from-red-500 to-orange-500';
      case 'high': return 'from-orange-500 to-yellow-500';
      case 'medium': return 'from-yellow-500 to-blue-500';
      case 'low': return 'from-green-500 to-teal-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return '📈';
    if (trend === 'declining') return '📉';
    return '➡️';
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            Productivity Forecaster
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBot(false)}
            className="text-blue-600"
          >
            ✕
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence mode="wait">
          {isAnalyzing && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-6"
            >
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-sm text-blue-600">Analyzing productivity trends...</p>
            </motion.div>
          )}

          {forecast && !isAnalyzing && (
            <motion.div
              key="forecast"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className={`p-4 bg-gradient-to-r ${getRiskColor(forecast.risk_level)} rounded-xl text-white`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Risk Level</span>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold capitalize">{forecast.risk_level}</p>
                <p className="text-sm mt-1 opacity-90">
                  {getTrendIcon(forecast.trend_direction)} Trend: {forecast.trend_direction}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-white rounded-lg border border-blue-200 text-center">
                  <p className="text-xs text-blue-600 mb-1">Deadlines</p>
                  <p className="text-lg font-bold text-blue-900">{forecast.stats.upcomingDeadlines}</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-blue-200 text-center">
                  <p className="text-xs text-blue-600 mb-1">Blocked</p>
                  <p className="text-lg font-bold text-blue-900">{forecast.stats.blockedTasks}</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-blue-200 text-center">
                  <p className="text-xs text-blue-600 mb-1">Hard Tasks</p>
                  <p className="text-lg font-bold text-blue-900">{forecast.stats.hardTasks}</p>
                </div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-blue-200">
                <p className="text-xs font-semibold text-blue-900 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Primary Bottleneck:
                </p>
                <p className="text-sm text-blue-800">{forecast.primary_bottleneck}</p>
              </div>

              <div className="p-3 bg-blue-100 rounded-lg">
                <p className="text-xs font-semibold text-blue-900 mb-1 flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Recommendation:
                </p>
                <p className="text-sm text-blue-800 mb-2">{forecast.recommendation}</p>
                <Badge className="bg-blue-500 text-white text-xs">
                  Impact: {forecast.estimated_impact}
                </Badge>
              </div>

              {forecast.insight_summary && (
                <div className="p-3 bg-white rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700">{forecast.insight_summary}</p>
                </div>
              )}

              <Button
                onClick={analyzeTrends}
                variant="outline"
                size="sm"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <TrendingUp className="w-3 h-3 mr-2" />
                Refresh Forecast
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {!forecast && !isAnalyzing && (
          <Button
            onClick={analyzeTrends}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Generate Forecast
          </Button>
        )}
      </CardContent>
    </Card>
  );
}