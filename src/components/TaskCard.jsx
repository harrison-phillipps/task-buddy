import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, Zap, Play, MoreVertical, CalendarDays } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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

export default function TaskCard({ task, onStart, onEdit, onDelete, onSpread, compact = false }) {
  const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const DifficultyIcon = difficultyIcons[task.difficulty]?.icon || Zap;
  const difficultyColor = difficultyIcons[task.difficulty]?.color || "text-gray-500";

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
              <div className="flex items-center gap-2 mb-2">
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
                <DropdownMenuItem onClick={() => onDelete?.(task)} className="text-red-600">
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {totalSubtasks > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">Progress</span>
                <span className="text-purple-600 font-semibold">
                  {completedSubtasks}/{totalSubtasks} steps
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {!compact && totalSubtasks > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {task.subtasks?.slice(0, 3).map((subtask, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {subtask.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className={`truncate ${subtask.completed ? "line-through text-gray-400" : "text-gray-700"}`}>
                      {subtask.title}
                    </span>
                  </div>
                  {subtask.estimated_minutes && (
                    <span className="text-xs text-gray-500 flex-shrink-0">{subtask.estimated_minutes}m</span>
                  )}
                </div>
              ))}
              {totalSubtasks > 3 && (
                <p className="text-xs text-gray-500 ml-6">+{totalSubtasks - 3} more steps</p>
              )}
            </div>
          )}

          <Button
            onClick={() => onStart?.(task)}
            className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold shadow-md"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Focus Session
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}