import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, Zap, Play, MoreVertical, Calendar, CalendarDays, Lock, RefreshCw, Link as LinkIcon, UserCircle, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import SubtaskTracker from "./tasks/SubtaskTracker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const categoryColors = {
  work: "bg-blue-100 text-blue-700 border-blue-200",
  personal: "bg-purple-100 text-purple-700 border-purple-200",
  health: "bg-green-100 text-green-700 border-green-200",
  creative: "bg-pink-100 text-pink-700 border-pink-200",
  learning: "bg-yellow-100 text-yellow-700 border-yellow-200",
  household: "bg-teal-100 text-teal-700 border-teal-200",
  other: "bg-gray-100 text-gray-700 border-gray-200"
};

const difficultyIcons = {
  easy: { icon: Zap, color: "text-green-500" },
  medium: { icon: Zap, color: "text-yellow-500" },
  hard: { icon: Zap, color: "text-red-500" }
};

export default function TaskCard({ task, onStart, onEdit, onDelete, onSpread, onSubtaskToggle, onSetDependency, onSetRecurring, onOpenCollabView, onStartCollab, allTasks = [], compact = false, showTeamInfo = false }) {
  const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const DifficultyIcon = difficultyIcons[task.difficulty]?.icon || Zap;
  const difficultyColor = difficultyIcons[task.difficulty]?.color || "text-gray-500";

  const isBlocked = task.blocked_by?.length > 0 && 
    task.blocked_by.some(id => {
      const blockerTask = allTasks.find(t => t.id === id);
      return blockerTask && blockerTask.status !== 'completed';
    });

  const handleSubtaskToggle = (index) => {
    if (onSubtaskToggle) {
      const updatedSubtasks = [...(task.subtasks || [])];
      updatedSubtasks[index] = {
        ...updatedSubtasks[index],
        completed: !updatedSubtasks[index].completed,
        completed_date: !updatedSubtasks[index].completed ? new Date().toISOString() : undefined
      };
      onSubtaskToggle(task.id, updatedSubtasks);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 border-purple-100">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {isBlocked && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    <Lock className="w-3 h-3 mr-1" />
                    Blocked
                  </Badge>
                )}
                {task.is_recurring && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Recurring
                  </Badge>
                )}
                <Badge className={`${categoryColors[task.category]} border font-medium`}>
                  {task.category}
                </Badge>
                {task.estimated_minutes && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.estimated_minutes}m total
                  </Badge>
                )}
                {task.spread_across_days && (
                  <Badge className="bg-teal-100 text-teal-700 border-teal-200 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    Spread
                  </Badge>
                )}
                {showTeamInfo && (task.assigned_to_name || task.assigned_to_users?.length > 0) && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <UserCircle className="w-3 h-3" />
                    {task.assigned_to_users?.length > 1 
                      ? `${task.assigned_to_users.length} members`
                      : task.assigned_to_name || task.assigned_to_users?.[0]?.user_name
                    }
                  </Badge>
                )}
                {task.team_id && (
                  <Badge className="bg-teal-100 text-teal-700 border-teal-200 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Team
                  </Badge>
                )}
                <DifficultyIcon className={`w-4 h-4 ${difficultyColor}`} />
              </div>
              <CardTitle className="text-lg font-bold text-gray-900">
                {task.title}
              </CardTitle>
              {task.description && !compact && (
                <p className="text-sm text-gray-600 mt-2">{task.description}</p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(task)}>
                  Edit Task
                </DropdownMenuItem>
                {onSpread && task.subtasks?.length > 0 && (
                  <DropdownMenuItem onClick={() => onSpread?.(task)}>
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Spread Across Days
                  </DropdownMenuItem>
                )}
                {onSetDependency && (
                  <DropdownMenuItem onClick={() => onSetDependency?.(task)}>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Add Dependency
                  </DropdownMenuItem>
                )}
                {onSetRecurring && (
                  <DropdownMenuItem onClick={() => onSetRecurring?.(task)}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Set Recurring
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onDelete?.(task)} className="text-red-600">
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {totalSubtasks > 0 && (
            <SubtaskTracker 
              subtasks={task.subtasks} 
              onToggle={handleSubtaskToggle}
              compact={compact}
            />
          )}

          <div className="space-y-2">
            <Button
              onClick={() => onStart?.(task)}
              disabled={isBlocked}
              className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold shadow-md disabled:opacity-50"
            >
              {isBlocked ? (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Task Blocked
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Focus Session
                </>
              )}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              {task.team_id && onOpenCollabView && (
                <Button
                  onClick={() => onOpenCollabView?.(task)}
                  variant="outline"
                  className="border-teal-200 hover:bg-teal-50"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Collaborate
                </Button>
              )}
              {task.team_id && onStartCollab && (
                <Button
                  onClick={() => onStartCollab?.(task)}
                  variant="outline"
                  className="border-purple-200 hover:bg-purple-50"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Team Session
                </Button>
              )}
            </div>
            {!task.focus_block_scheduled && task.status !== 'completed' && (
              <Button
                onClick={() => {
                  // Open schedule focus modal
                  window.dispatchEvent(new CustomEvent('scheduleFocusBlock', { detail: task }));
                }}
                variant="outline"
                className="w-full border-purple-200 hover:bg-purple-50"
              >
                <Zap className="w-4 h-4 mr-2" />
                Schedule Focus
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}