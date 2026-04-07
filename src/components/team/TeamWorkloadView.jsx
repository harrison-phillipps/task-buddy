import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, CheckCircle, Clock, AlertCircle, BarChart2 } from "lucide-react";

const STATUS_COLORS = {
  completed: "bg-green-500",
  in_progress: "bg-blue-500",
  not_started: "bg-gray-300",
  blocked: "bg-red-500",
};

export default function TeamWorkloadView({ tasks = [], members = [] }) {
  const workloads = members.map(member => {
    const assigned = tasks.filter(
      t => t.assigned_to === member.id || t.assigned_to_users?.some(u => u.user_id === member.id)
    );
    const completed = assigned.filter(t => t.status === "completed").length;
    const inProgress = assigned.filter(t => t.status === "in_progress").length;
    const notStarted = assigned.filter(t => t.status === "not_started").length;
    const blocked = assigned.filter(t => t.status === "blocked").length;
    const total = assigned.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const estimatedMinutes = assigned
      .filter(t => t.status !== "completed")
      .reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);

    return { member, total, completed, inProgress, notStarted, blocked, completionRate, estimatedMinutes };
  });

  // Sort by most tasks first
  workloads.sort((a, b) => b.total - a.total);

  const totalTasks = tasks.length;
  const totalCompleted = tasks.filter(t => t.status === "completed").length;
  const overallRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Overall project progress */}
      <Card className="bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 border-purple-200 dark:border-purple-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="w-5 h-5 text-purple-600" />
            Overall Project Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">{overallRate}%</span>
            <span className="text-sm text-gray-500">{totalCompleted} / {totalTasks} tasks done</span>
          </div>
          <Progress value={overallRate} className="h-3" />
          <div className="grid grid-cols-4 gap-2 pt-1">
            {[
              { label: "Completed", count: tasks.filter(t => t.status === "completed").length, color: "text-green-600" },
              { label: "In Progress", count: tasks.filter(t => t.status === "in_progress").length, color: "text-blue-600" },
              { label: "Not Started", count: tasks.filter(t => t.status === "not_started").length, color: "text-gray-500" },
              { label: "Blocked", count: tasks.filter(t => t.status === "blocked").length, color: "text-red-600" },
            ].map(({ label, count, color }) => (
              <div key={label} className="text-center">
                <p className={`text-lg font-bold ${color}`}>{count}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Per-member workloads */}
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-100 dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5 text-teal-600" />
            Individual Workloads
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {workloads.length === 0 && (
            <p className="text-center text-gray-500 py-4 text-sm">No members yet</p>
          )}
          {workloads.map(({ member, total, completed, inProgress, notStarted, blocked, completionRate, estimatedMinutes }) => (
            <div key={member.id} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-purple-400 to-teal-400 flex items-center justify-center text-white text-xs font-bold">
                    {(member.full_name || member.email)?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                      {member.full_name || member.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {total} task{total !== 1 ? "s" : ""}
                      {estimatedMinutes > 0 && ` · ~${Math.round(estimatedMinutes / 60)}h remaining`}
                    </p>
                  </div>
                </div>
                <span className="flex-shrink-0 text-sm font-semibold text-purple-600 dark:text-purple-400">
                  {completionRate}%
                </span>
              </div>

              <Progress value={completionRate} className="h-2" />

              <div className="flex gap-2 flex-wrap">
                {completed > 0 && (
                  <span className="text-xs flex items-center gap-1 text-green-700 dark:text-green-400">
                    <CheckCircle className="w-3 h-3" />{completed} done
                  </span>
                )}
                {inProgress > 0 && (
                  <span className="text-xs flex items-center gap-1 text-blue-700 dark:text-blue-400">
                    <Clock className="w-3 h-3" />{inProgress} active
                  </span>
                )}
                {blocked > 0 && (
                  <span className="text-xs flex items-center gap-1 text-red-700 dark:text-red-400">
                    <AlertCircle className="w-3 h-3" />{blocked} blocked
                  </span>
                )}
                {notStarted > 0 && (
                  <Badge variant="outline" className="text-xs h-5">{notStarted} pending</Badge>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}