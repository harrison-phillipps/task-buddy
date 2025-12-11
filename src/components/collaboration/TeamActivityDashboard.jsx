import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Users, Clock, CheckCircle, TrendingUp } from "lucide-react";
import TaskActivityFeed from "./TaskActivityFeed";

export default function TeamActivityDashboard({ team, currentUser }) {
  const { data: teamTasks = [] } = useQuery({
    queryKey: ['teamTasks', team?.id],
    queryFn: () => base44.entities.Task.filter({ team_id: team.id }, '-created_date'),
    enabled: !!team?.id,
    refetchInterval: 10000 // Real-time updates every 10 seconds
  });

  const myTasks = teamTasks.filter(t => t.assigned_to === currentUser?.id);
  const unassignedTasks = teamTasks.filter(t => !t.assigned_to && t.status !== 'completed');
  const completedTasks = teamTasks.filter(t => t.status === 'completed');
  const inProgressTasks = teamTasks.filter(t => t.status === 'in_progress');

  return (
    <div className="space-y-6">
      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-none">
          <CardContent className="p-6">
            <Users className="w-8 h-8 mb-2" />
            <p className="text-3xl font-bold">{team?.member_ids?.length || 0}</p>
            <p className="text-sm text-purple-100">Team Members</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-none">
          <CardContent className="p-6">
            <TrendingUp className="w-8 h-8 mb-2" />
            <p className="text-3xl font-bold">{inProgressTasks.length}</p>
            <p className="text-sm text-blue-100">In Progress</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white border-none">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 mb-2" />
            <p className="text-3xl font-bold">{completedTasks.length}</p>
            <p className="text-sm text-green-100">Completed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-none">
          <CardContent className="p-6">
            <Clock className="w-8 h-8 mb-2" />
            <p className="text-3xl font-bold">{unassignedTasks.length}</p>
            <p className="text-sm text-orange-100">Unassigned</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed and Task Lists */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activity">Team Activity</TabsTrigger>
          <TabsTrigger value="my-tasks">
            My Tasks ({myTasks.length})
          </TabsTrigger>
          <TabsTrigger value="unassigned">
            Unassigned ({unassignedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <TaskActivityFeed teamId={team?.id} />
        </TabsContent>

        <TabsContent value="my-tasks">
          <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
            <CardContent className="p-6">
              {myTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">No tasks assigned to you</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{task.title}</h4>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {task.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {task.category}
                            </Badge>
                          </div>
                        </div>
                        {task.estimated_minutes && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.estimated_minutes}m
                          </Badge>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unassigned">
          <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
            <CardContent className="p-6">
              {unassignedTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">All tasks are assigned</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unassignedTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg border border-orange-200 bg-orange-50 hover:border-orange-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{task.title}</h4>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {task.category}
                            </Badge>
                            <Badge className="bg-orange-200 text-orange-800 text-xs">
                              Needs assignment
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}