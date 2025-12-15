import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Play } from "lucide-react";
import { toast } from "sonner";
import { addMinutes } from "date-fns";

export default function CollaborativeFocusModal({ task, team, open, onOpenChange, currentUser }) {
  const queryClient = useQueryClient();
  const [duration, setDuration] = useState(25);

  const createSessionMutation = useMutation({
    mutationFn: async (sessionData) => {
      const session = await base44.entities.CollaborativeFocusSession.create(sessionData);
      
      // Notify team members
      const memberIds = team.member_ids || [];
      const notificationPromises = memberIds
        .filter(id => id !== currentUser.id)
        .map(userId => 
          base44.entities.Notification.create({
            user_id: userId,
            type: "team_mention",
            title: "Collaborative Focus Session Started",
            message: `${currentUser.full_name || currentUser.email} started a focus session on "${task.title}"`,
            related_id: session.id,
            related_type: "task",
            action_url: `/FocusSession?collaborativeSessionId=${session.id}`,
            priority: "high"
          })
        );
      
      await Promise.all(notificationPromises);
      return session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['collaborativeSessions'] });
      toast.success("Collaborative focus session started!");
      onOpenChange(false);
      window.location.href = `/FocusSession?collaborativeSessionId=${session.id}`;
    },
  });

  const handleStart = () => {
    const now = new Date();
    createSessionMutation.mutate({
      team_id: team.id,
      task_id: task.id,
      task_title: task.title,
      host_id: currentUser.id,
      host_name: currentUser.full_name || currentUser.email,
      duration_minutes: duration,
      started_at: now.toISOString(),
      ends_at: addMinutes(now, duration).toISOString(),
      participants: [{
        user_id: currentUser.id,
        user_name: currentUser.full_name || currentUser.email,
        joined_at: now.toISOString()
      }]
    });
  };

  if (!task || !team || !currentUser) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Start Collaborative Focus Session
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-sm text-gray-600">Task</Label>
            <p className="font-semibold text-gray-900">{task.title}</p>
          </div>

          <div>
            <Label className="text-sm text-gray-600">Team</Label>
            <p className="font-semibold text-gray-900">{team.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              All team members will be notified
            </p>
          </div>

          <div>
            <Label htmlFor="duration">Session Duration</Label>
            <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
              <SelectTrigger id="duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="25">25 minutes (Pomodoro)</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleStart}
            disabled={createSessionMutation.isPending}
            className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}