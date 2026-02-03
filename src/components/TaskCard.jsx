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
  work: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-800",
  personal: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 border-purple-200 dark:border-purple-800",
  health: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 border-green-200 dark:border-green-800",
  creative: "bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-200 border-pink-200 dark:border-pink-800",
  learning: "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800",
  household: "bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-200 border-teal-200 dark:border-teal-800",
  other: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700"
};

const difficultyIcons = {
  easy: { icon: Zap, color: "text-green-500 dark:text-green-400" },
  medium: { icon: Zap, color: "text-yellow-500 dark:text-yellow-400" },
  hard: { icon: Zap, color: "text-red-500 dark:text-red-400" }
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
      <Card className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 border-purple-100 dark:border-gray-700 ${isCompleted ? 'opacity-60' : ''} ${hasAIPriority && !isCompleted ? `border-l-4 bg-gradient-to-r ${aiPriorityGradient} bg-opacity-5` : ''}`}>
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
                    <Badge variant="outline" className="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                      <Lock className="w-3 h-3 mr-1" />
                      Blocked
                    </Badge>
                  )}
                  <RecurringTaskBadge task={task} />
                <Badge className={`${categoryColors[task.category]} border font-medium`}>
                  {task.category}
                </Badge>
                {task.estimated_minutes && (
                  <Badge variant="outline" className="flex items-center gap-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                    <Clock className="w-3 h-3" />
                    {task.estimated_minutes}m total
                  </Badge>
                )}
                {task.spread_across_days && (
                  <Badge className="bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-200 border-teal-200 dark:border-teal-800 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    Spread
                  </Badge>
                )}
                {task.task_priority && (
                  <Badge className={
                    task.task_priority === 'must_do' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 border-red-200 dark:border-red-800' :
                    task.task_priority === 'should_do' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800' :
                    'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 border-green-200 dark:border-green-800'
                  }>
                    {task.task_priority === 'must_do' ? '🔴 Must Do' :
                     task.task_priority === 'should_do' ? '🟡 Should Do' :
                     '🟢 Could Do'}
                  </Badge>
                )}
                {showTeamInfo && (task.assigned_to_name || task.assigned_to_users?.length > 0) && (
                  <Badge variant="outline" className="flex items-center gap-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                    <UserCircle className="w-3 h-3" />
                    {task.assigned_to_users?.length > 1 
                      ? `${task.assigned_to_users.length} members`
                      : task.assigned_to_name || task.assigned_to_users?.[0]?.user_name
                    }
                  </Badge>
                )}
                {task.team_id && (
                  <Badge className="bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-200 border-teal-200 dark:border-teal-800 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Team
                  </Badge>
                )}
                <DifficultyIcon className={`w-4 h-4 ${difficultyColor}`} />
              </div>
              <CardTitle className={`text-lg font-bold text-gray-900 dark:text-gray-100 ${isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
                {task.title}
              </CardTitle>
              {task.description && !compact && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{task.description}</p>
              )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 dark:text-gray-300">
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
                {task.status !== 'completed' && (!task.subtasks || task.subtasks.length === 0) && (
                  <DropdownMenuItem onClick={() => onEdit?.(task, 'ai-breakdown')}>
                    <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                    AI Break Down Task
                  </DropdownMenuItem>
                )}
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