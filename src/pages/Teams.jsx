import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Copy, Check, Settings, LogOut, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function TeamsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [copiedCode, setCopiedCode] = useState(null);
  const [joinCode, setJoinCode] = useState("");

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

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      const allTeams = await base44.entities.Team.list();
      return allTeams.filter(team => 
        team.owner_id === currentUser.id || team.member_ids?.includes(currentUser.id)
      );
    },
    enabled: !!currentUser,
  });

  const createTeamMutation = useMutation({
    mutationFn: async (teamData) => {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      return await base44.entities.Team.create({
        ...teamData,
        owner_id: currentUser.id,
        member_ids: [],
        invite_code: inviteCode
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setShowCreateDialog(false);
      setNewTeamName("");
      setNewTeamDescription("");
      toast.success("Space created!");
    },
  });

  const joinTeamMutation = useMutation({
    mutationFn: async (code) => {
      const allTeams = await base44.entities.Team.list();
      const team = allTeams.find(t => t.invite_code === code.toUpperCase());
      
      if (!team) throw new Error("Invalid invite code");
      if (team.member_ids?.includes(currentUser.id)) throw new Error("Already a member");

      await base44.entities.Team.update(team.id, {
        member_ids: [...(team.member_ids || []), currentUser.id]
      });

      return team;
    },
    onSuccess: (team) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setJoinCode("");
      toast.success(`Joined ${team.name}!`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const leaveTeamMutation = useMutation({
    mutationFn: async (team) => {
      await base44.entities.Team.update(team.id, {
        member_ids: team.member_ids.filter(id => id !== currentUser.id)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success("Left team");
    },
  });

  const handleCreateTeam = () => {
    if (!newTeamName.trim()) return;
    createTeamMutation.mutate({
      name: newTeamName,
      description: newTeamDescription,
    });
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Invite code copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
              Shared Spaces
            </h1>
            <p className="text-gray-600">Collaborate with your team, partner, friends, or family</p>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Space
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Shared Space</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Space Name</Label>
                  <Input
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="e.g., Our Home Projects, Sarah & John, Study Group..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    placeholder="What will you work on together?"
                    className="h-24"
                  />
                </div>
                <Button
                  onClick={handleCreateTeam}
                  disabled={!newTeamName.trim() || createTeamMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-500 to-teal-500"
                >
                  Create Space
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
          <CardHeader>
            <CardTitle className="text-lg">Join a Space</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter invite code"
                className="flex-1"
              />
              <Button
                onClick={() => joinTeamMutation.mutate(joinCode)}
                disabled={!joinCode.trim() || joinTeamMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Join
              </Button>
            </div>
          </CardContent>
        </Card>

        {teams.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
            <CardContent className="py-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No spaces yet</h3>
              <p className="text-gray-600 mb-6">Create a space to collaborate with others</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teams.map((team) => {
              const isOwner = team.owner_id === currentUser?.id;
              const memberCount = (team.member_ids?.length || 0) + 1; // +1 for owner

              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card 
                    className="bg-white/80 backdrop-blur-sm border-purple-100 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(createPageUrl(`TeamDashboard?teamId=${team.id}`))}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {team.name}
                            {isOwner && <Crown className="w-4 h-4 text-yellow-600" />}
                          </CardTitle>
                          {team.description && (
                            <p className="text-sm text-gray-600 mt-1">{team.description}</p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                      </div>

                      {isOwner && (
                        <div className="p-3 bg-purple-50 rounded-lg space-y-2">
                          <Label className="text-xs text-gray-600">Invite Code</Label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 bg-white rounded border text-sm font-mono">
                              {team.invite_code}
                            </code>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyCode(team.invite_code);
                              }}
                            >
                              {copiedCode === team.invite_code ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                        {!isOwner && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => leaveTeamMutation.mutate(team)}
                            className="flex-1"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Leave Space
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(createPageUrl(`TeamDashboard?teamId=${team.id}`))}
                          className="flex-1"
                        >
                          Open Dashboard
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}