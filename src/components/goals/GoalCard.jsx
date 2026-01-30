import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, Calendar, TrendingUp, Sparkles, MoreVertical, Trash2, CheckCircle, Brain } from "lucide-react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const typeColors = {
  okr: "bg-blue-100 text-blue-700 border-blue-200",
  quarterly: "bg-purple-100 text-purple-700 border-purple-200",
  annual: "bg-teal-100 text-teal-700 border-teal-200",
  milestone: "bg-pink-100 text-pink-700 border-pink-200",
  personal: "bg-green-100 text-green-700 border-green-200"
};

const statusColors = {
  not_started: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  at_risk: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700"
};

export default function GoalCard({ goal, tasks = [], onUpdate, onDelete, onBreakdown, onCoach, isCoaching }) {
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const keyResultsProgress = goal.key_results?.length > 0
    ? goal.key_results.reduce((sum, kr) => {
        const progress = kr.target_value > 0 ? (kr.current_value / kr.target_value) * 100 : 0;
        return sum + Math.min(progress, 100);
      }, 0) / goal.key_results.length
    : 0;

  const overallProgress = goal.key_results?.length > 0 ? keyResultsProgress : taskProgress;

  const daysUntilTarget = goal.target_date 
    ? Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 border-purple-100">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className={`${typeColors[goal.type]} border font-medium`}>
                  {goal.type.toUpperCase()}
                </Badge>
                <Badge className={statusColors[goal.status]}>
                  {goal.status.replace('_', ' ')}
                </Badge>
                {goal.priority && (
                  <Badge variant="outline">{goal.priority} priority</Badge>
                )}
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                {goal.title}
              </CardTitle>
              {goal.description && (
                <p className="text-sm text-gray-600 mt-2">{goal.description}</p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onCoach}>
                  <Brain className="w-4 h-4 mr-2" />
                  {isCoaching ? "Hide AI Coach" : "Get AI Coaching"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onBreakdown}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Breakdown
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onUpdate({ status: 'completed' })}
                  disabled={goal.status === 'completed'}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Complete
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Goal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {goal.target_date && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Target: {new Date(goal.target_date).toLocaleDateString()}</span>
              {daysUntilTarget !== null && (
                <Badge variant="outline" className={daysUntilTarget < 7 ? "text-orange-600" : ""}>
                  {daysUntilTarget > 0 ? `${daysUntilTarget} days left` : daysUntilTarget === 0 ? "Today!" : "Overdue"}
                </Badge>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Overall Progress</span>
              <span className="text-gray-900 font-bold">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>

          {goal.key_results?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700 uppercase">Key Results:</p>
              {goal.key_results.map((kr, index) => {
                const progress = kr.target_value > 0 ? (kr.current_value / kr.target_value) * 100 : 0;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{kr.title}</span>
                      <span className="text-gray-600 font-medium">
                        {kr.current_value}/{kr.target_value} {kr.unit}
                      </span>
                    </div>
                    <Progress value={Math.min(progress, 100)} className="h-2" />
                  </div>
                );
              })}
            </div>
          )}

          {totalTasks > 0 && (
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Linked Tasks</span>
                </div>
                <span className="text-sm text-purple-700 font-semibold">
                  {completedTasks}/{totalTasks} completed
                </span>
              </div>
            </div>
          )}

          {totalTasks === 0 && (
            <Button
              onClick={onBreakdown}
              variant="outline"
              className="w-full border-purple-200 hover:bg-purple-50 text-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Break Down with AI
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}