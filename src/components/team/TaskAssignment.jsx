import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserCircle } from "lucide-react";

export default function TaskAssignment({ task, teamMembers, onAssign }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <UserCircle className="w-4 h-4" />
        Assign To
      </Label>
      <Select
        value={task.assigned_to || "unassigned"}
        onValueChange={(value) => {
          const assignedUser = teamMembers.find(m => m.id === value);
          onAssign({
            assigned_to: value === "unassigned" ? null : value,
            assigned_to_name: assignedUser ? (assignedUser.full_name || assignedUser.email) : null
          });
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Unassigned" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned</SelectItem>
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