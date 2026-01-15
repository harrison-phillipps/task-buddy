import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function RealTimeTaskSync({ teamId, onTaskUpdate }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!teamId) return;

    const unsubscribe = base44.entities.Task.subscribe((event) => {
      // Only process events for this team
      if (event.data?.team_id === teamId) {
        queryClient.invalidateQueries({ queryKey: ['teamTasks', teamId] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        
        if (onTaskUpdate) {
          onTaskUpdate(event);
        }
      }
    });

    return unsubscribe;
  }, [teamId, queryClient, onTaskUpdate]);

  return null;
}