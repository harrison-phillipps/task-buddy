import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "from-purple-400 to-purple-600",
  "from-teal-400 to-teal-600",
  "from-pink-400 to-pink-600",
  "from-blue-400 to-blue-600",
  "from-orange-400 to-orange-600",
  "from-green-400 to-green-600",
];

function getColor(userId) {
  let hash = 0;
  for (let i = 0; i < (userId || "").length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function TeamMemberAvatars({ team, currentUser, maxVisible = 5 }) {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!team) return;

    const allMembers = [];

    // Owner
    if (team.owner_id) {
      allMembers.push({
        id: team.owner_id,
        name: team.owner_name || "Owner",
        email: team.owner_email,
        role: "owner",
      });
    }

    // Members array
    if (team.members?.length) {
      team.members.forEach(m => {
        if (!allMembers.find(ex => ex.id === m.user_id)) {
          allMembers.push({
            id: m.user_id,
            name: m.user_name,
            email: m.user_email,
            role: m.role || "member",
          });
        }
      });
    }

    setMembers(allMembers);
  }, [team?.id, team?.members?.length]);

  if (!team || members.length === 0) return null;

  const visible = members.slice(0, maxVisible);
  const overflow = members.length - maxVisible;

  return (
    <TooltipProvider>
      <div className="flex items-center">
        <div className="flex -space-x-2">
          {visible.map((member, i) => (
            <Tooltip key={member.id}>
              <TooltipTrigger asChild>
                <div
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${getColor(member.id)} flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-gray-800 cursor-default shadow-sm ${
                    member.id === currentUser?.id ? "ring-2 ring-purple-400 ring-offset-1" : ""
                  }`}
                  style={{ zIndex: visible.length - i }}
                >
                  {getInitials(member.name)}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-medium">{member.name}</p>
                <p className="text-xs text-gray-400">{member.email}</p>
                {member.role === "owner" && <p className="text-xs text-purple-400">Owner</p>}
                {member.id === currentUser?.id && <p className="text-xs text-teal-400">You</p>}
              </TooltipContent>
            </Tooltip>
          ))}
          {overflow > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-200 text-xs font-bold border-2 border-white dark:border-gray-800 cursor-default shadow-sm">
                  +{overflow}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{overflow} more member{overflow > 1 ? "s" : ""}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
          {members.length} member{members.length !== 1 ? "s" : ""}
        </span>
      </div>
    </TooltipProvider>
  );
}