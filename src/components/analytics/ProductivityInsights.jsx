import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, TrendingDown, AlertCircle, CheckCircle, 
  Clock, Zap, Target, Calendar, ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";

export default function ProductivityInsights({ tasks, focusSessions, userProgress }) {
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const blockedTasks = tasks.filter(t => t.blocked_by && t.blocked_by.length > 0 && t.status !== 'completed');
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false;
    return new Date(t.due_date) < new Date();
  });

  // Calculate average completion time
  const avgCompletionTime = completedTasks.length > 0
    ? Math.round(completedTasks.reduce((sum, t) => sum + (t.estimated_minutes || 30), 0) / completedTasks.length)
    : 0;

  // Find most productive category
  const categoryCount = completedTasks.reduce((acc, t) => {
    const cat = t.category || 'personal';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0];

  // Calculate streak info
  const streakTrend = (userProgress?.current_streak || 0) >= (userProgress?.longest_streak || 1) * 0.5 
    ? 'positive' 
    : 'needs_attention';

  const insights = [
    {
      icon: CheckCircle,
      title: "Completion Rate",
      value: `${tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%`,
      description: completedTasks.length > 0 
        ? `${completedTasks.length} of ${tasks.length} tasks completed`
        : "Start completing tasks to see your rate",
      trend: completedTasks.length >= tasks.length * 0.5 ? "positive" : "neutral",
      color: "purple"
    },
    {
      icon: Clock,
      title: "Avg Task Duration",
      value: `${avgCompletionTime}m`,
      description: avgCompletionTime <= 30 
        ? "Great at breaking tasks into manageable chunks!" 
        : "Consider breaking larger tasks into smaller pieces",
      trend: avgCompletionTime <= 30 ? "positive" : "neutral",
      color: "teal"
    },
    {
      icon: Target,
      title: "Top Category",
      value: topCategory ? topCategory[0].charAt(0).toUpperCase() + topCategory[0].slice(1) : "None yet",
      description: topCategory 
        ? `You've completed ${topCategory[1]} ${topCategory[0]} tasks`
        : "Complete tasks to see patterns",
      trend: "positive",
      color: "blue"
    },
    {
      icon: Zap,
      title: "Current Streak",
      value: `${userProgress?.current_streak || 0} days`,
      description: userProgress?.longest_streak 
        ? `Longest streak: ${userProgress.longest_streak} days`
        : "Keep completing daily tasks!",
      trend: streakTrend,
      color: "orange"
    }
  ];

  const alerts = [];
  
  if (overdueTasks.length > 0) {
    alerts.push({
      type: "warning",
      icon: Calendar,
      message: `${overdueTasks.length} task${overdueTasks.length > 1 ? 's are' : ' is'} overdue`,
      action: "Review and prioritize"
    });
  }

  if (blockedTasks.length > 0) {
    alerts.push({
      type: "info",
      icon: AlertCircle,
      message: `${blockedTasks.length} task${blockedTasks.length > 1 ? 's are' : ' is'} blocked`,
      action: "Complete dependencies first"
    });
  }

  if (inProgressTasks.length > 3) {
    alerts.push({
      type: "info",
      icon: TrendingDown,
      message: "Too many tasks in progress",
      action: "Focus on finishing before starting new"
    });
  }

  return (
    <div className="space-y-6">
      {/* Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {insights.map((insight, index) => (
          <motion.div
            key={insight.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-purple-100 h-full">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    insight.color === 'purple' ? 'bg-purple-100' :
                    insight.color === 'teal' ? 'bg-teal-100' :
                    insight.color === 'blue' ? 'bg-blue-100' :
                    'bg-orange-100'
                  }`}>
                    <insight.icon className={`w-4 h-4 ${
                      insight.color === 'purple' ? 'text-purple-600' :
                      insight.color === 'teal' ? 'text-teal-600' :
                      insight.color === 'blue' ? 'text-blue-600' :
                      'text-orange-600'
                    }`} />
                  </div>
                  {insight.trend === 'positive' && (
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Good
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-1">{insight.title}</p>
                <p className="text-xl font-bold text-gray-900 mb-1">{insight.value}</p>
                <p className="text-xs text-gray-600">{insight.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Attention Needed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert, index) => (
              <div 
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  alert.type === 'warning' ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <alert.icon className={`w-5 h-5 ${
                    alert.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
                  }`} />
                  <span className="text-sm font-medium text-gray-700">{alert.message}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  {alert.action}
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}