import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, Calendar, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export default function GoalsProgress({ currentUser }) {
  const { data: goals = [] } = useQuery({
    queryKey: ['goals', currentUser?.email],
    queryFn: () => currentUser ? base44.entities.Goal.filter({ created_by: currentUser.email }) : [],
    enabled: !!currentUser,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', currentUser?.email],
    queryFn: () => currentUser ? base44.entities.Task.filter({ created_by: currentUser.email }) : [],
    enabled: !!currentUser,
  });

  const activeGoals = goals.filter(g => g.status !== 'completed');
  
  const calculateGoalProgress = (goal) => {
    if (goal.type === 'okr' && goal.key_results?.length > 0) {
      const avgProgress = goal.key_results.reduce((sum, kr) => {
        const progress = kr.target_value > 0 ? (kr.current_value / kr.target_value) * 100 : 0;
        return sum + Math.min(progress, 100);
      }, 0) / goal.key_results.length;
      return Math.round(avgProgress);
    }
    
    const goalTasks = tasks.filter(t => t.goal_id === goal.id);
    if (goalTasks.length === 0) return 0;
    const completedTasks = goalTasks.filter(t => t.status === 'completed').length;
    return Math.round((completedTasks / goalTasks.length) * 100);
  };

  const overallProgress = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((sum, goal) => sum + calculateGoalProgress(goal), 0) / activeGoals.length)
    : 0;

  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const atRiskGoals = activeGoals.filter(g => g.status === 'at_risk').length;

  return (
    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-100 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Goals Overview
          </span>
          <Badge variant="outline" className="text-sm">
            {activeGoals.length} active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress Circle */}
        <div className="flex items-center justify-center">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="#f3f0ff"
                strokeWidth="12"
              />
              <motion.circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 70}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 70 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 70 * (1 - overallProgress / 100) }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#14B8A6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
                {overallProgress}%
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Overall</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{completedGoals}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Completed</div>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{activeGoals.length}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">In Progress</div>
          </div>
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <Calendar className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{atRiskGoals}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">At Risk</div>
          </div>
        </div>

        {/* Individual Goals Progress */}
        {activeGoals.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active Goals</h4>
            {activeGoals.slice(0, 3).map((goal) => {
              const progress = calculateGoalProgress(goal);
              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate flex-1">
                      {goal.title}
                    </span>
                    <span className="text-sm font-bold text-purple-600 ml-2">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              );
            })}
          </div>
        )}

        {activeGoals.length === 0 && (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
            No active goals. Set some goals to track your progress!
          </div>
        )}
      </CardContent>
    </Card>
  );
}