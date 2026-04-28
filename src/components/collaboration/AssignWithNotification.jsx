import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCircle, ChevronDown, Check, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createNotification } from "@/components/notifications/NotificationUtils";
import toast from "react-hot-toast";
import { createPageUrl } from "@/utils";

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function AssignWithNotification({ task, teamMembers = [], currentUser, onAssign }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const assignedIds = new Set((task.assigned_to_users || []).map(u => u.user_id));

  const handleToggleMember = async (member) => {
    setSaving(true);
    try {
      let newAssigned;
      if (assignedIds.has(member.id)) {
        // Unassign
        newAssigned = (task.assigned_to_users || []).filter(u => u.user_id !== member.id);
      } else {
        // Assign
        newAssigned = [
          ...(task.assigned_to_users || []),
          { user_id: member.id, user_name: member.full_name || member.name }
        ];

        // Fire in-app notification to the assigned user
        if (member.id !== currentUser?.id) {
          createNotification({
            userId: member.id,
            type: "team_mention",
            title: `You've been assigned a task`,
            message: `${currentUser?.full_name || "Someone"} assigned you: "${task.title}"`,
            relatedId: task.id,
            relatedType: "task",
            priority: task.priority === "urgent" ? "critical" : "high",
            actionUrl: createPageUrl("Tasks"),
            sendEmail: true,
          }).catch(console.error);
        }
      }

      const primary = newAssigned[0];
      const updateData = {
        assigned_to_users: newAssigned,
        assigned_to: primary?.user_id || null,
        assigned_to_name: primary?.user_name || null,
      };

      await onAssign(updateData);
      toast.success(assignedIds.has(member.id) ? "Member unassigned" : `Assigned to ${member.full_name || member.name} — they'll be notified!`);
    } catch (err) {
      toast.error("Failed to update assignment");
    } finally {
      setSaving(false);
    }
  };

  const assignedCount = task.assigned_to_users?.length || 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs border-purple-200 hover:bg-purple-50 gap-1"
        >
          <UserCircle className="w-3.5 h-3.5 text-purple-600" />
          {assignedCount > 0
            ? assignedCount === 1
              ? task.assigned_to_users[0].user_name?.split(" ")[0] || "1 assigned"
              : `${assignedCount} assigned`
            : "Assign"}
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="text-xs font-semibold text-gray-500 mb-2 px-1">Assign to team members</p>
        {teamMembers.length === 0 ? (
          <p className="text-xs text-gray-400 px-1 py-2">No team members found</p>
        ) : (
          <div className="space-y-1">
            {teamMembers.map(member => {
              const isAssigned = assignedIds.has(member.id);
              return (
                <button
                  key={member.id}
                  onClick={() => handleToggleMember(member)}
                  disabled={saving}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                    isAssigned ? "bg-purple-50 text-purple-700" : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-teal-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {getInitials(member.full_name || member.name)}
                  </div>
                  <span className="text-xs flex-1 truncate">
                    {member.full_name || member.name}
                    {member.id === currentUser?.id && " (You)"}
                  </span>
                  {isAssigned && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}