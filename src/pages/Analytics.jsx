import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { hasFeatureAccess, UpgradePrompt } from "@/components/subscription/FeatureGate";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, Clock, Target, Loader2,
  CheckCircle, Flame
} from "lucide-react";
import { motion } from "framer-motion";



import ProductivityInsights from "@/components/analytics/ProductivityInsights";
import CategoryChart from "@/components/analytics/CategoryChart";
import DifficultyChart from "@/components/analytics/DifficultyChart";
import WeeklyTrendsChart from "@/components/analytics/WeeklyTrendsChart";
import PeakProductivityDashboard from "@/components/analytics/PeakProductivityDashboard";
import AITipsSection from "@/components/analytics/AITipsSection";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("30d");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const userTier = currentUser?.subscription_tier || "free";
  const hasAdvanced = hasFeatureAccess(userTier, "advanced_analytics");
  
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
  });

  const { data: focusSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['focusSessions'],
    queryFn: () => base44.entities.FocusSession.list('-created_date'),
  });

  const { data: userProgressList = [] } = useQuery({
    queryKey: ['progress'],
    queryFn: () => base44.entities.UserProgress.list(),
  });

  const userProgress = userProgressList[0];
  const isLoading = tasksLoading || sessionsLoading;

  // Calculate key metrics
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const totalFocusMinutes = focusSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto" />
          <p className="text-gray-600">Analyzing your productivity data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-purple-600" />
              Productivity Analytics
            </h1>
            <p className="text-gray-600 mt-1">AI-powered insights into your work patterns</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={timeRange === "7d" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange("7d")}
              className={timeRange === "7d" ? "bg-purple-600" : ""}
            >
              7 Days
            </Button>
            <Button
              variant={timeRange === "30d" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange("30d")}
              className={timeRange === "30d" ? "bg-purple-600" : ""}
            >
              30 Days
            </Button>
            <Button
              variant={timeRange === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange("all")}
              className={timeRange === "all" ? "bg-purple-600" : ""}
            >
              All Time
            </Button>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-700">{completedTasks.length}</p>
                    <p className="text-xs text-purple-600">Tasks Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-teal-700">{Math.round(totalFocusMinutes / 60)}h</p>
                    <p className="text-xs text-teal-600">Focus Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-700">{completionRate}%</p>
                    <p className="text-xs text-orange-600">Completion Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center">
                    <Flame className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-pink-700">{userProgress?.current_streak || 0}</p>
                    <p className="text-xs text-pink-600">Day Streak</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* AI Insights Section */}
        <AITipsSection 
          tasks={tasks} 
          focusSessions={focusSessions} 
          userProgress={userProgress} 
        />

        {/* Peak Productivity — Pro+ */}
        {hasAdvanced && <PeakProductivityDashboard focusSessions={focusSessions} />}

        {/* Charts Grid — Pro+ */}
        {hasAdvanced ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeeklyTrendsChart tasks={tasks} focusSessions={focusSessions} />
            <CategoryChart tasks={tasks} />
            <DifficultyChart tasks={tasks} />
          </div>
        ) : (
          <UpgradePrompt feature="Advanced Charts & Trends" requiredTier="pro" />
        )}

        {/* Detailed Insights — Pro+ */}
        {hasAdvanced && <ProductivityInsights
          tasks={tasks}
          focusSessions={focusSessions}
          userProgress={userProgress}
        />}
      </div>
    </div>
  );
}