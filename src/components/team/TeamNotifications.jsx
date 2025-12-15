import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, AlertCircle, Info, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function TeamNotifications({ team, currentUser }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");

  const { data: notifications = [] } = useQuery({
    queryKey: ['teamNotifications', team.id],
    queryFn: () => base44.entities.TeamNotification.filter({ team_id: team.id }, '-created_date'),
    refetchInterval: 15000
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (notificationId) => {
      const notification = notifications.find(n => n.id === notificationId);
      const acknowledged = notification.acknowledged_by || [];
      
      if (!acknowledged.some(a => a.user_id === currentUser.id)) {
        acknowledged.push({
          user_id: currentUser.id,
          user_name: currentUser.full_name || currentUser.email,
          acknowledged_at: new Date().toISOString()
        });
        
        return base44.entities.TeamNotification.update(notificationId, {
          acknowledged_by: acknowledged
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamNotifications'] });
    }
  });

  const filteredNotifications = notifications.filter(n => {
    if (filter === "unread") {
      return !n.acknowledged_by?.some(a => a.user_id === currentUser.id);
    }
    return true;
  });

  const unreadCount = notifications.filter(n => 
    !n.acknowledged_by?.some(a => a.user_id === currentUser.id)
  ).length;

  const priorityColors = {
    low: "bg-gray-100 text-gray-700",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700"
  };

  const typeIcons = {
    task_assigned: CheckCircle,
    task_commented: Info,
    status_changed: AlertCircle,
    deadline_reminder: AlertCircle,
    session_started: Bell,
    task_completed: Check,
    general: Info
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-600" />
            Team Notifications
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "unread" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("unread")}
            >
              Unread ({unreadCount})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {filteredNotifications.map((notification) => {
                const isAcknowledged = notification.acknowledged_by?.some(
                  a => a.user_id === currentUser.id
                );
                const Icon = typeIcons[notification.type] || Info;
                const acknowledgedCount = notification.acknowledged_by?.length || 0;

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-4 rounded-lg border transition-all ${
                      isAcknowledged 
                        ? 'bg-gray-50 border-gray-200' 
                        : 'bg-white border-purple-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${priorityColors[notification.priority]}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{notification.title}</h4>
                          <Badge className={priorityColors[notification.priority]}>
                            {notification.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
                          </span>
                          <div className="flex items-center gap-2">
                            {acknowledgedCount > 0 && (
                              <span className="text-xs text-gray-500">
                                ✓ {acknowledgedCount} acknowledged
                              </span>
                            )}
                            {!isAcknowledged && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => acknowledgeMutation.mutate(notification.id)}
                                disabled={acknowledgeMutation.isPending}
                                className="text-xs h-7"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Acknowledge
                              </Button>
                            )}
                            {isAcknowledged && (
                              <Badge variant="outline" className="text-xs">
                                <Check className="w-3 h-3 mr-1" />
                                Read
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}