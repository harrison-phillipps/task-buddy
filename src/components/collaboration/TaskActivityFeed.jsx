import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Activity, CheckCircle, MessageSquare, UserPlus, Edit, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const activityIcons = {
  created: Edit,
  updated: Edit,
  completed: CheckCircle,
  assigned: UserPlus,
  commented: MessageSquare,
  status_changed: Activity,
  subtask_completed: CheckCircle
};

const activityColors = {
  created: "text-blue-500",
  updated: "text-purple-500",
  completed: "text-green-500",
  assigned: "text-teal-500",
  commented: "text-orange-500",
  status_changed: "text-indigo-500",
  subtask_completed: "text-emerald-500"
};

export default function TaskActivityFeed({ taskId, teamId, compact = false }) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['taskActivities', taskId, teamId],
    queryFn: async () => {
      const filters = taskId ? { task_id: taskId } : teamId ? { team_id: teamId } : {};
      return await base44.entities.TaskActivity.filter(filters, '-created_date', compact ? 5 : 20);
    },
    refetchInterval: 5000, // Real-time updates every 5 seconds
    enabled: !!(taskId || teamId)
  });

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
        <CardContent className="p-6 text-center">
          <Activity className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">No activity yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
      {!compact && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            Activity Feed
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={compact ? "p-4" : "p-6"}>
        <div className="space-y-3">
          {activities.map((activity, index) => {
            const Icon = activityIcons[activity.action_type] || Activity;
            const colorClass = activityColors[activity.action_type] || "text-gray-500";

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">{activity.user_name || 'Someone'}</span>
                    {' '}
                    <span className="text-gray-600">{activity.description}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(activity.created_date), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}