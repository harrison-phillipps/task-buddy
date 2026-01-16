import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, AlertCircle, Users, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function RealTimeNotificationCenter({ team, currentUser }) {
  const [latestNotification, setLatestNotification] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['teamNotifications', team?.id],
    queryFn: async () => {
      if (!team) return [];
      return base44.entities.TeamNotification.filter({ team_id: team.id }, '-created_date', 20);
    },
    enabled: !!team,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  useEffect(() => {
    if (!notifications?.length) return;

    const newest = notifications[0];
    if (!latestNotification || newest.id !== latestNotification.id) {
      setLatestNotification(newest);
      
      // Show popup for new notifications
      if (latestNotification && newest.id !== latestNotification.id) {
        setShowPopup(true);
        toast.info(newest.title, {
          description: newest.message
        });
        
        setTimeout(() => setShowPopup(false), 5000);
      }
    }
  }, [notifications]);

  const unreadCount = notifications.filter(n => 
    !n.acknowledged_by?.some(a => a.user_id === currentUser?.id)
  ).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task_assigned': return <Users className="w-4 h-4 text-blue-500" />;
      case 'task_completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'deadline_reminder': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'session_started': return <Bell className="w-4 h-4 text-purple-500" />;
      default: return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <>
      <AnimatePresence>
        {showPopup && latestNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 50 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 50 }}
            className="fixed top-20 right-6 z-50 max-w-sm"
          >
            <Card className="bg-white shadow-2xl border-2 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(latestNotification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm text-gray-900">{latestNotification.title}</p>
                      <Badge className={`${getPriorityColor(latestNotification.priority)} text-white text-xs`}>
                        {latestNotification.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">{latestNotification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(latestNotification.created_date).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {unreadCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-6 right-6 z-40"
        >
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:shadow-xl transition-shadow">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">{unreadCount}</span>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}