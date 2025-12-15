import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Users } from "lucide-react";

export default function TaskAssignment({ task, teamMembers, onAssign }) {
  const assignedUsers = task.assigned_to_users || [];
  const displayValue = assignedUsers.length > 0 
    ? assignedUsers.length === teamMembers.length 
      ? "all" 
      : assignedUsers[0].user_id
    : task.assigned_to || "unassigned";

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <UserCircle className="w-4 h-4" />
        Assign To
      </Label>
      {assignedUsers.length > 1 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {assignedUsers.map(user => (
            <Badge key={user.user_id} variant="outline" className="text-xs">
              {user.user_name}
            </Badge>
          ))}
        </div>
      )}
      <Select
        value={displayValue}
        onValueChange={(value) => {
          if (value === "all") {
            onAssign({
              assigned_to: null,
              assigned_to_name: null,
              assigned_to_users: teamMembers.map(m => ({
                user_id: m.id,
                user_name: m.full_name || m.email
              }))
            });
          } else if (value === "unassigned") {
            onAssign({
              assigned_to: null,
              assigned_to_name: null,
              assigned_to_users: []
            });
          } else {
            const assignedUser = teamMembers.find(m => m.id === value);
            onAssign({
              assigned_to: value,
              assigned_to_name: assignedUser ? (assignedUser.full_name || assignedUser.email) : null,
              assigned_to_users: [{
                user_id: value,
                user_name: assignedUser ? (assignedUser.full_name || assignedUser.email) : null
              }]
            });
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Unassigned" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              All Members
            </div>
          </SelectItem>
          {teamMembers.map(member => (
            <SelectItem key={member.id} value={member.id}>
              {member.full_name || member.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}