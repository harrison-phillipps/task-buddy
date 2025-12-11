import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Users, MessageSquare, Activity, X, CheckCircle, Clock, User } from "lucide-react";
import TaskCommentsSection from "../team/TaskCommentsSection";
import TaskActivityFeed from "./TaskActivityFeed";
import TaskAssignment from "../team/TaskAssignment";
import SubtaskTracker from "../tasks/SubtaskTracker";

export default function CollaborativeTaskView({ task, open, onOpenChange, currentUser }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");

  const { data: team } = useQuery({
    queryKey: ['team', task?.team_id],
    queryFn: () => base44.entities.Team.filter({ id: task.team_id }),
    enabled: !!task?.team_id,
    select: (data) => data[0]
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: async (updatedTask, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // Log activity
      await base44.entities.TaskActivity.create({
        task_id: task.id,
        team_id: task.team_id,
        user_id: currentUser.id,
        user_name: currentUser.display_name || currentUser.full_name,
        action_type: "updated",
        description: "updated the task"
      });
      
      queryClient.invalidateQueries({ queryKey: ['taskActivities'] });
    }
  });

  const handleStatusChange = async (newStatus) => {
    await updateTaskMutation.mutateAsync({
      id: task.id,
      data: { status: newStatus }
    });

    await base44.entities.TaskActivity.create({
      task_id: task.id,
      team_id: task.team_id,
      user_id: currentUser.id,
      user_name: currentUser.display_name || currentUser.full_name,
      action_type: "status_changed",
      description: `changed status to ${newStatus.replace('_', ' ')}`
    });
  };

  if (!task) return null;

  const statusColors = {
    not_started: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    blocked: "bg-red-100 text-red-700"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{task.title}</DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={statusColors[task.status]}>
                  {task.status.replace('_', ' ')}
                </Badge>
                <Badge variant="outline">{task.category}</Badge>
                <Badge variant="outline">{task.difficulty}</Badge>
                {task.assigned_to && (
                  <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {task.assigned_to_name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="assignment">
              <Users className="w-4 h-4 mr-1" />
              Assignment
            </TabsTrigger>
            <TabsTrigger value="comments">
              <MessageSquare className="w-4 h-4 mr-1" />
              Comments
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="w-4 h-4 mr-1" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {task.description && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Description</h4>
                <p className="text-gray-600">{task.description}</p>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Status</h4>
              <div className="flex gap-2 flex-wrap">
                {['not_started', 'in_progress', 'completed', 'blocked'].map(status => (
                  <Button
                    key={status}
                    variant={task.status === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStatusChange(status)}
                    disabled={updateTaskMutation.isPending}
                  >
                    {status.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>

            {task.subtasks && task.subtasks.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Subtasks</h4>
                <SubtaskTracker
                  task={task}
                  onUpdate={(updatedSubtasks) => {
                    updateTaskMutation.mutate({
                      id: task.id,
                      data: { subtasks: updatedSubtasks }
                    });
                  }}
                  compact
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              {task.estimated_minutes && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Estimated Time</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {task.estimated_minutes} min
                  </p>
                </div>
              )}
              {task.due_date && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Due Date</p>
                  <p className="font-semibold">{new Date(task.due_date).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="assignment">
            <TaskAssignment
              task={task}
              team={team}
              currentUser={currentUser}
              onAssign={async (userId, userName) => {
                await updateTaskMutation.mutateAsync({
                  id: task.id,
                  data: { assigned_to: userId, assigned_to_name: userName }
                });

                await base44.entities.TaskActivity.create({
                  task_id: task.id,
                  team_id: task.team_id,
                  user_id: currentUser.id,
                  user_name: currentUser.display_name || currentUser.full_name,
                  action_type: "assigned",
                  description: `assigned this task to ${userName}`
                });
              }}
            />
          </TabsContent>

          <TabsContent value="comments">
            <TaskCommentsSection
              task={task}
              currentUser={currentUser}
              team={team}
              onCommentAdded={async () => {
                await base44.entities.TaskActivity.create({
                  task_id: task.id,
                  team_id: task.team_id,
                  user_id: currentUser.id,
                  user_name: currentUser.display_name || currentUser.full_name,
                  action_type: "commented",
                  description: "added a comment"
                });
                queryClient.invalidateQueries({ queryKey: ['taskActivities'] });
              }}
            />
          </TabsContent>

          <TabsContent value="activity">
            <TaskActivityFeed taskId={task.id} teamId={task.team_id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}