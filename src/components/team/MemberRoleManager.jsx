import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, UserMinus, Crown } from "lucide-react";
import { ROLES, getUserRole, getRoleBadgeColor, getRoleLabel, hasPermission, PERMISSIONS } from "./TeamPermissions";
import { toast } from "sonner";

export default function MemberRoleManager({ team, members, currentUser }) {
  const queryClient = useQueryClient();

  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }) => {
      const updatedRoles = { ...team.member_roles };
      if (newRole === ROLES.MEMBER) {
        delete updatedRoles[userId]; // Default role
      } else {
        updatedRoles[userId] = newRole;
      }
      return base44.entities.Team.update(team.id, { member_roles: updatedRoles });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success("Member role updated");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId) => {
      const updatedMembers = team.member_ids.filter(id => id !== userId);
      const updatedRoles = { ...team.member_roles };
      delete updatedRoles[userId];
      return base44.entities.Team.update(team.id, { 
        member_ids: updatedMembers,
        member_roles: updatedRoles
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success("Member removed from team");
    },
  });

  const canManageMembers = hasPermission(team, currentUser.id, PERMISSIONS.MANAGE_MEMBERS);

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const handleRoleChange = (userId, newRole) => {
    if (!canManageMembers) return;
    updateMemberRoleMutation.mutate({ userId, newRole });
  };

  const handleRemoveMember = (userId) => {
    if (!canManageMembers) return;
    if (confirm("Remove this member from the team?")) {
      removeMemberMutation.mutate(userId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          Team Members & Roles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Owner */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-teal-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-teal-500 text-white">
                  {getInitials(members.find(m => m.id === team.owner_id)?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-gray-900">
                  {members.find(m => m.id === team.owner_id)?.full_name || 'Owner'}
                  {team.owner_id === currentUser.id && <span className="text-gray-500 text-sm ml-1">(You)</span>}
                </p>
                <p className="text-xs text-gray-600">{members.find(m => m.id === team.owner_id)?.email}</p>
              </div>
            </div>
            <Badge className="bg-purple-100 text-purple-700 border-purple-300 flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Owner
            </Badge>
          </div>

          {/* Other Members */}
          {members.filter(m => m.id !== team.owner_id).map(member => {
            const role = getUserRole(team, member.id);
            const isCurrentUser = member.id === currentUser.id;

            return (
              <div key={member.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400 text-white">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {member.full_name}
                      {isCurrentUser && <span className="text-gray-500 text-sm ml-1">(You)</span>}
                    </p>
                    <p className="text-xs text-gray-600">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManageMembers && !isCurrentUser ? (
                    <>
                      <Select
                        value={role}
                        onValueChange={(newRole) => handleRoleChange(member.id, newRole)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ROLES.ADMIN}>Admin</SelectItem>
                          <SelectItem value={ROLES.MEMBER}>Member</SelectItem>
                          <SelectItem value={ROLES.VIEWER}>Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Badge className={getRoleBadgeColor(role)}>
                      {getRoleLabel(role)}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Role Permissions:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li><strong>Admin:</strong> Full access - manage members, edit settings, manage all tasks</li>
            <li><strong>Member:</strong> Create, edit, and delete tasks; send messages</li>
            <li><strong>Viewer:</strong> View tasks and messages only</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}