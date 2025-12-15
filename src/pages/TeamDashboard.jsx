import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CheckCircle, Clock, AlertCircle, MessageSquare, Plus, Shield, ListTodo, Brain, Calendar, Bell, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import TaskCard from "../components/TaskCard";
import TaskCommentsSection from "../components/team/TaskCommentsSection";
import TaskAssignment from "../components/team/TaskAssignment";
import TeamActivityDashboard from "../components/collaboration/TeamActivityDashboard";
import CollaborativeTaskView from "../components/collaboration/CollaborativeTaskView";
import TeamMessaging from "../components/team/TeamMessaging";
import MemberRoleManager from "../components/team/MemberRoleManager";
import { hasPermission, PERMISSIONS } from "../components/team/TeamPermissions";
import TeamBrainDump from "../components/team/TeamBrainDump";
import CollaborativeFocusModal from "../components/team/CollaborativeFocusModal";
import ActiveCollaborativeSessions from "../components/team/ActiveCollaborativeSessions";
import TeamCalendar from "../components/team/TeamCalendar";
import TeamNotifications from "../components/team/TeamNotifications";
import TeamTemplates from "../components/team/TeamTemplates";

export default function TeamDashboard() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const teamId = urlParams.get('teamId');
  
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCollabView, setShowCollabView] = useState(false);
  const [collabTask, setCollabTask] = useState(null);
  const [showCollabFocus, setShowCollabFocus] = useState(false);
  const [collabFocusTask, setCollabFocusTask] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: team, isLoading: teamLoading, error: teamError } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const allTeams = await base44.entities.Team.list();
      return allTeams.find(t => t.id === teamId) || null;
    },
    enabled: !!teamId,
    retry: 1,
  });

  const { data: teamTasks = [] } = useQuery({
    queryKey: ['teamTasks', teamId],
    queryFn: () => base44.entities.Task.filter({ team_id: teamId }, '-created_date'),
    enabled: !!teamId,
  });

  // Get team members from team entity (includes stored user details)
  const teamMembers = (() => {
    if (!team) return [];
    
    const members = [];
    
    // Add owner
    if (team.owner_id) {
      members.push({
        id: team.owner_id,
        full_name: team.owner_name || team.owner_email,
        email: team.owner_email,
        role: 'admin'
      });
    }
    
    // Add other members
    if (team.members && Array.isArray(team.members)) {
      team.members.forEach(member => {
        if (member && member.user_id) {
          members.push({
            id: member.user_id,
            full_name: member.user_name || member.user_email,
            email: member.user_email,
            role: member.role || 'member'
          });
        }
      });
    }
    
    return members;
  })();

  const myTasks = teamTasks.filter(t => 
    t.assigned_to === currentUser?.id || 
    t.assigned_to_users?.some(u => u.user_id === currentUser?.id)
  );
  const unassignedTasks = teamTasks.filter(t => 
    !t.assigned_to && (!t.assigned_to_users || t.assigned_to_users.length === 0)
  );
  const completedTasks = teamTasks.filter(t => t.status === 'completed');

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
    },
  });

  if (!teamId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">No team selected</p>
      </div>
    );
  }

  if (teamLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (teamError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading team</p>
          <p className="text-sm text-gray-600">{teamError.message}</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Team not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent break-words">
                {team.name}
              </h1>
              {team.description && (
                <p className="text-gray-600 text-sm sm:text-base">{team.description}</p>
              )}
            </div>
            <Link to={createPageUrl("Tasks") + `?teamId=${teamId}`} className="w-full sm:w-auto">
              <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{teamMembers.length}</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  In Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">
                  {teamTasks.filter(t => t.status === 'in_progress').length}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{completedTasks.length}</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  Unassigned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{unassignedTasks.length}</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-white/80 backdrop-blur-sm border border-purple-100 flex-wrap h-auto">
              <TabsTrigger value="overview" className="flex-shrink-0">
                <ListTodo className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex-shrink-0">
                <Calendar className="w-4 h-4 mr-2" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex-shrink-0">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex-shrink-0">
                <FileText className="w-4 h-4 mr-2" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="braindump" className="flex-shrink-0">
                <Brain className="w-4 h-4 mr-2" />
                Brain Dump
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex-shrink-0">
                <MessageSquare className="w-4 h-4 mr-2" />
                Team Chat
              </TabsTrigger>
              <TabsTrigger value="members" className="flex-shrink-0">
                <Shield className="w-4 h-4 mr-2" />
                Members & Roles
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="space-y-6">
                <ActiveCollaborativeSessions teamId={teamId} currentUser={currentUser} />
                <TeamActivityDashboard team={team} currentUser={currentUser} />
              </div>
            </TabsContent>

            <TabsContent value="calendar">
              <TeamCalendar team={team} currentUser={currentUser} />
            </TabsContent>

            <TabsContent value="notifications">
              <TeamNotifications team={team} currentUser={currentUser} />
            </TabsContent>

            <TabsContent value="templates">
              <TeamTemplates team={team} currentUser={currentUser} />
            </TabsContent>

            <TabsContent value="braindump">
              <TeamBrainDump team={team} currentUser={currentUser} members={teamMembers} />
            </TabsContent>

            <TabsContent value="chat">
              <TeamMessaging team={team} currentUser={currentUser} />
            </TabsContent>

            <TabsContent value="members">
              <MemberRoleManager 
                team={team} 
                members={teamMembers}
                currentUser={currentUser}
              />
            </TabsContent>
          </Tabs>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs defaultValue="my-tasks" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="my-tasks">My Tasks ({myTasks.length})</TabsTrigger>
                <TabsTrigger value="all-tasks">All Tasks ({teamTasks.length})</TabsTrigger>
                <TabsTrigger value="unassigned">Unassigned ({unassignedTasks.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="my-tasks" className="space-y-4">
                {myTasks.length === 0 ? (
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardContent className="py-12 text-center">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-600">No tasks assigned to you yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  myTasks.map(task => (
                    <div key={task.id} className="space-y-3">
                      <div onClick={() => setSelectedTask(task)}>
                        <TaskCard
                          task={task}
                          onUpdate={(data) => updateTaskMutation.mutate({ id: task.id, data })}
                          onDelete={() => {}}
                          allTasks={teamTasks}
                          showTeamInfo
                          onStartCollab={(task) => {
                            setCollabFocusTask(task);
                            setShowCollabFocus(true);
                          }}
                        />
                      </div>
                      <div className="ml-4">
                        <TaskAssignment
                          task={task}
                          teamMembers={teamMembers}
                          onAssign={(data) => {
                            updateTaskMutation.mutate({ id: task.id, data }, {
                              onSuccess: async () => {
                                if (data.assigned_to || data.assigned_to_users?.length > 0) {
                                  try {
                                    await base44.entities.TeamNotification.create({
                                      team_id: task.team_id,
                                      type: "task_assigned",
                                      title: `Task assigned: "${task.title}"`,
                                      message: data.assigned_to_users?.length > 1 
                                        ? `Task assigned to ${data.assigned_to_users.length} team members`
                                        : `Task assigned to ${data.assigned_to_name}`,
                                      priority: "medium",
                                      related_id: task.id,
                                      created_by: currentUser?.id
                                    });
                                    queryClient.invalidateQueries({ queryKey: ['teamNotifications'] });
                                  } catch (error) {
                                    console.error("Error creating notification:", error);
                                  }
                                }
                              }
                            });
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
                      </TabsContent>

              <TabsContent value="all-tasks" className="space-y-4">
                {teamTasks.map(task => (
                  <div key={task.id} className="space-y-3">
                    <div onClick={() => setSelectedTask(task)}>
                      <TaskCard
                        task={task}
                        onUpdate={(data) => updateTaskMutation.mutate({ id: task.id, data })}
                        onDelete={() => {}}
                        allTasks={teamTasks}
                        showTeamInfo
                        onOpenCollabView={(task) => {
                          setCollabTask(task);
                          setShowCollabView(true);
                        }}
                        onStartCollab={(task) => {
                          setCollabFocusTask(task);
                          setShowCollabFocus(true);
                        }}
                      />
                    </div>
                    <div className="ml-4">
                      <TaskAssignment
                        task={task}
                        teamMembers={teamMembers}
                        onAssign={(data) => {
                          updateTaskMutation.mutate({ id: task.id, data }, {
                            onSuccess: async () => {
                              if (data.assigned_to || data.assigned_to_users?.length > 0) {
                                try {
                                  await base44.entities.TeamNotification.create({
                                    team_id: task.team_id,
                                    type: "task_assigned",
                                    title: `Task assigned: "${task.title}"`,
                                    message: data.assigned_to_users?.length > 1 
                                      ? `Task assigned to ${data.assigned_to_users.length} team members`
                                      : `Task assigned to ${data.assigned_to_name}`,
                                    priority: "medium",
                                    related_id: task.id,
                                    created_by: currentUser?.id
                                  });
                                  queryClient.invalidateQueries({ queryKey: ['teamNotifications'] });
                                } catch (error) {
                                  console.error("Error creating notification:", error);
                                }
                              }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="unassigned" className="space-y-4">
                {unassignedTasks.length === 0 ? (
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardContent className="py-12 text-center">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-600">All tasks are assigned!</p>
                    </CardContent>
                  </Card>
                ) : (
                  unassignedTasks.map(task => (
                    <div key={task.id} className="space-y-3">
                      <div onClick={() => setSelectedTask(task)}>
                        <TaskCard
                          task={task}
                          onUpdate={(data) => updateTaskMutation.mutate({ id: task.id, data })}
                          onDelete={() => {}}
                          allTasks={teamTasks}
                          showTeamInfo
                          onOpenCollabView={(task) => {
                            setCollabTask(task);
                            setShowCollabView(true);
                          }}
                        />
                      </div>
                      <div className="ml-4">
                        <TaskAssignment
                          task={task}
                          teamMembers={teamMembers}
                          onAssign={(data) => {
                            updateTaskMutation.mutate({ id: task.id, data }, {
                              onSuccess: async () => {
                                if (data.assigned_to || data.assigned_to_users?.length > 0) {
                                  try {
                                    await base44.entities.TeamNotification.create({
                                      team_id: task.team_id,
                                      type: "task_assigned",
                                      title: `Task assigned: "${task.title}"`,
                                      message: data.assigned_to_users?.length > 1 
                                        ? `Task assigned to ${data.assigned_to_users.length} team members`
                                        : `Task assigned to ${data.assigned_to_name}`,
                                      priority: "medium",
                                      related_id: task.id,
                                      created_by: currentUser?.id
                                    });
                                    queryClient.invalidateQueries({ queryKey: ['teamNotifications'] });
                                  } catch (error) {
                                    console.error("Error creating notification:", error);
                                  }
                                }
                              }
                            });
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
              <CardHeader>
                <CardTitle className="text-lg">Team Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {teamMembers.map(member => {
                  const memberTasks = teamTasks.filter(t => t.assigned_to === member.id);
                  const completedCount = memberTasks.filter(t => t.status === 'completed').length;
                  
                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-teal-400 flex items-center justify-center text-white font-semibold">
                          {member.full_name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.full_name || member.email}</p>
                          <p className="text-xs text-gray-500">
                            {memberTasks.length} task{memberTasks.length !== 1 ? 's' : ''} • {completedCount} done
                          </p>
                        </div>
                      </div>
                      {member.id === team.owner_id && (
                        <Badge variant="outline">Owner</Badge>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {selectedTask && (
              <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Task Discussion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 p-3 bg-purple-50 rounded-lg">
                    <p className="font-medium text-sm text-gray-900">{selectedTask.title}</p>
                  </div>
                  <TaskCommentsSection
                    task={selectedTask}
                    currentUser={currentUser}
                    team={team}
                    onCommentAdded={() => {
                      queryClient.invalidateQueries({ queryKey: ['teamNotifications'] });
                    }}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <CollaborativeTaskView
          task={collabTask}
          open={showCollabView}
          onOpenChange={setShowCollabView}
          currentUser={currentUser}
        />

        <CollaborativeFocusModal
          task={collabFocusTask}
          team={team}
          open={showCollabFocus}
          onOpenChange={setShowCollabFocus}
          currentUser={currentUser}
        />
        </div>
        </div>
        );
        }