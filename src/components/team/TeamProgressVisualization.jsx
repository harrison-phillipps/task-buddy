import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function TeamProgressVisualization({ team, tasks, members }) {
  if (!tasks?.length) return null;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const notStartedTasks = tasks.filter(t => t.status === 'not_started').length;

  const overallProgress = Math.round((completedTasks / totalTasks) * 100);

  // Member contributions
  const memberStats = members.map(member => {
    const memberTasks = tasks.filter(t => 
      t.assigned_to === member.id || 
      t.assigned_to_users?.some(u => u.user_id === member.id)
    );
    const memberCompleted = memberTasks.filter(t => t.status === 'completed').length;
    
    return {
      id: member.id,
      name: member.full_name || member.email,
      email: member.email,
      totalTasks: memberTasks.length,
      completed: memberCompleted,
      progress: memberTasks.length > 0 ? Math.round((memberCompleted / memberTasks.length) * 100) : 0
    };
  }).sort((a, b) => b.completed - a.completed);

  // Category breakdown
  const categoryStats = tasks.reduce((acc, task) => {
    const cat = task.category || 'other';
    if (!acc[cat]) {
      acc[cat] = { total: 0, completed: 0 };
    }
    acc[cat].total++;
    if (task.status === 'completed') {
      acc[cat].completed++;
    }
    return acc;
  }, {});

  const categoryLabels = {
    work: "💼 Work",
    personal: "🏠 Personal",
    health: "💪 Health",
    creative: "🎨 Creative",
    learning: "📚 Learning",
    household: "🧹 Household",
    other: "📋 Other"
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-purple-50 to-teal-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <TrendingUp className="w-5 h-5" />
            Team Progress Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center mb-4">
            <p className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent mb-2">
              {overallProgress}%
            </p>
            <p className="text-sm text-gray-600">Overall Completion</p>
          </div>

          <Progress value={overallProgress} className="h-3" />

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-lg border border-purple-200 text-center">
              <CheckCircle className="w-4 h-4 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900">{completedTasks}</p>
              <p className="text-xs text-gray-600">Completed</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-purple-200 text-center">
              <Clock className="w-4 h-4 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900">{inProgressTasks}</p>
              <p className="text-xs text-gray-600">In Progress</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-purple-200 text-center">
              <div className="w-4 h-4 rounded-full bg-gray-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900">{notStartedTasks}</p>
              <p className="text-xs text-gray-600">Not Started</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 text-base">
            <Users className="w-4 h-4" />
            Member Contributions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {memberStats.map((member, idx) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-teal-400 flex items-center justify-center text-white text-xs font-bold">
                    {member.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500">
                      {member.completed}/{member.totalTasks} completed
                    </p>
                  </div>
                </div>
                <Badge className={
                  member.progress >= 75 ? 'bg-green-500' :
                  member.progress >= 50 ? 'bg-blue-500' :
                  member.progress >= 25 ? 'bg-yellow-500' :
                  'bg-gray-500'
                }>
                  {member.progress}%
                </Badge>
              </div>
              <Progress value={member.progress} className="h-2" />
            </motion.div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-white border-purple-200">
        <CardHeader>
          <CardTitle className="text-base text-gray-900">Category Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(categoryStats).map(([category, stats]) => {
            const progress = Math.round((stats.completed / stats.total) * 100);
            return (
              <div key={category} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{categoryLabels[category] || category}</span>
                  <span className="text-gray-500">{stats.completed}/{stats.total}</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}