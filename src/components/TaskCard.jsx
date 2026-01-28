import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, Zap, Play, MoreVertical, Calendar, CalendarDays, Lock, RefreshCw, Link as LinkIcon, UserCircle, Users, Sparkles, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import SubtaskTracker from "./tasks/SubtaskTracker";
import RecurringTaskBadge from "./tasks/RecurringTaskBadge";
import { getAIPriorityColor, getAIPriorityLabel, getUrgencyIcon } from "./ai/TaskPrioritizer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

export default function TaskCard({ task, onStart, onEdit, onDelete, onSpread, onSubtaskToggle, onSetDependency, onSetRecurring, onOpenCollabView, onStartCollab, onQuickComplete, onChangePriority, allTasks = [], compact = false, showTeamInfo = false }) {
  const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
  const isCompleted = task.status === 'completed';

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

  const hasAIPriority = task.ai_priority_score !== undefined;
  const aiPriorityGradient = hasAIPriority ? getAIPriorityColor(task.ai_priority_score) : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 border-purple-100 ${isCompleted ? 'opacity-60' : ''} ${hasAIPriority && !isCompleted ? `border-l-4 bg-gradient-to-r ${aiPriorityGradient} bg-opacity-5` : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <button
                onClick={() => onQuickComplete?.(task)}
                className="flex-shrink-0 mt-1 hover:scale-110 transition-transform"
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-7 h-7 text-green-500" />
                ) : (
                  <Circle className="w-7 h-7 text-gray-400 hover:text-green-500" />
                )}
              </button>
              <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {hasAIPriority && !isCompleted && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className={`bg-gradient-to-r ${aiPriorityGradient} text-white border-none font-semibold cursor-help`}>
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI: {task.ai_priority_score} {getUrgencyIcon(task.ai_urgency_level)}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold mb-1">{getAIPriorityLabel(task.ai_priority_score)}</p>
                          <p className="text-xs mb-2">{task.ai_reasoning}</p>
                          <p className="text-xs text-gray-400">Best time: {task.ai_best_time} • Match: {task.ai_energy_match}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {isBlocked && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      <Lock className="w-3 h-3 mr-1" />
                      Blocked
                    </Badge>
                  )}
                  <RecurringTaskBadge task={task} />
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
                {task.task_priority && (
                  <Badge className={
                    task.task_priority === 'must_do' ? 'bg-red-100 text-red-700 border-red-200' :
                    task.task_priority === 'should_do' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                    'bg-green-100 text-green-700 border-green-200'
                  }>
                    {task.task_priority === 'must_do' ? '🔴 Must Do' :
                     task.task_priority === 'should_do' ? '🟡 Should Do' :
                     '🟢 Could Do'}
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
              <CardTitle className={`text-lg font-bold text-gray-900 ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                {task.title}
              </CardTitle>
              {task.description && !compact && (
                <p className="text-sm text-gray-600 mt-2">{task.description}</p>
              )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {task.status !== 'completed' && onQuickComplete && (
                  <DropdownMenuItem onClick={() => onQuickComplete?.(task)}>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                    Mark as Complete
                  </DropdownMenuItem>
                )}
                {onChangePriority && (
                  <>
                    <DropdownMenuItem onClick={() => onChangePriority?.(task, 'must_do')}>
                      🔴 Must Do
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChangePriority?.(task, 'should_do')}>
                      🟡 Should Do
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChangePriority?.(task, 'could_do')}>
                      🟢 Could Do
                    </DropdownMenuItem>
                  </>
                )}
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
            {!isCompleted && (
              <Button
                onClick={() => onStart?.(task)}
                disabled={isBlocked}
                className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold shadow-md disabled:opacity-50 text-base py-6"
              >
                {isBlocked ? (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Task Blocked
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start Now
                  </>
                )}
              </Button>
            )}

          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}