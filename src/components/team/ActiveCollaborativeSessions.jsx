import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Play, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

export default function ActiveCollaborativeSessions({ teamId, currentUser }) {
  const { data: sessions = [] } = useQuery({
    queryKey: ['collaborativeSessions', teamId],
    queryFn: () => base44.entities.CollaborativeFocusSession.filter({ 
      team_id: teamId, 
      status: 'active' 
    }, '-started_at'),
    refetchInterval: 5000,
  });

  if (sessions.length === 0) return null;

  const handleJoin = (sessionId) => {
    window.location.href = `/FocusSession?collaborativeSessionId=${sessionId}`;
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-teal-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-purple-600" />
          Active Focus Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sessions.map((session) => {
            const isParticipant = session.participants?.some(p => p.user_id === currentUser?.id);
            
            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-white rounded-lg border border-purple-200 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 mb-1">{session.task_title}</h4>
                    <p className="text-sm text-gray-600">
                      Hosted by {session.host_name}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {session.participants?.length || 0} online
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    Started {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
                  </div>
                  <Button
                    onClick={() => handleJoin(session.id)}
                    size="sm"
                    className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    {isParticipant ? 'Rejoin' : 'Join'}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}