import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { format, startOfWeek, addDays, isToday, isPast } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function WeeklyOverview({ tasks }) {
  const [weekOffset, setWeekOffset] = React.useState(0);
  
  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getTasksForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    return tasks.filter(task => {
      // Check if task has due date on this day
      if (task.due_date && format(new Date(task.due_date), 'yyyy-MM-dd') === dateStr) {
        return true;
      }
      
      // Check if any subtask is scheduled for this day
      if (task.subtasks?.some(st => st.scheduled_date === dateStr && !st.completed)) {
        return true;
      }
      
      return false;
    });
  };

  const getSubtasksForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const subtasks = [];
    
    tasks.forEach(task => {
      task.subtasks?.forEach(st => {
        if (st.scheduled_date === dateStr) {
          subtasks.push({ ...st, taskTitle: task.title, taskId: task.id });
        }
      });
    });
    
    return subtasks;
  };

  const getDayStats = (date) => {
    const dayTasks = getTasksForDay(date);
    const daySubtasks = getSubtasksForDay(date);
    const totalMinutes = daySubtasks.reduce((sum, st) => sum + (st.estimated_minutes || 0), 0);
    const completedSubtasks = daySubtasks.filter(st => st.completed).length;
    
    return {
      tasks: dayTasks.length,
      subtasks: daySubtasks.length,
      completedSubtasks,
      totalMinutes
    };
  };

  const totalWeekMinutes = weekDays.reduce((sum, day) => sum + getDayStats(day).totalMinutes, 0);
  const totalWeekTasks = weekDays.reduce((sum, day) => sum + getDayStats(day).subtasks, 0);

  return (
    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-100 dark:border-gray-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-purple-600" />
            Weekly Overview
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setWeekOffset(weekOffset - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setWeekOffset(0)}
              className={weekOffset === 0 ? "bg-purple-100" : ""}
            >
              This Week
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setWeekOffset(weekOffset + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </p>
      </CardHeader>
      <CardContent>
        {/* Week summary */}
        <div className="flex gap-4 mb-4 p-3 bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalWeekTasks}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Steps</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{Math.round(totalWeekMinutes / 60)}h</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Planned</p>
          </div>
        </div>

        {/* Day cards */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, index) => {
            const stats = getDayStats(day);
            const isCurrentDay = isToday(day);
            const isPastDay = isPast(day) && !isCurrentDay;
            const daySubtasks = getSubtasksForDay(day);
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-2 rounded-lg text-center transition-all ${
                  isCurrentDay 
                    ? 'bg-gradient-to-br from-purple-500 to-teal-500 text-white shadow-lg' 
                    : isPastDay
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                }`}
              >
                <p className={`text-xs font-medium ${isCurrentDay ? 'text-purple-100' : 'text-gray-600 dark:text-gray-400'}`}>
                  {format(day, 'EEE')}
                </p>
                <p className={`text-lg font-bold ${isCurrentDay ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                  {format(day, 'd')}
                </p>
                
                {stats.subtasks > 0 ? (
                  <div className="mt-1">
                    <div className={`text-xs ${isCurrentDay ? 'text-purple-100' : 'text-gray-600 dark:text-gray-400'}`}>
                      {stats.completedSubtasks}/{stats.subtasks}
                    </div>
                    <div className="w-full h-1 bg-white/30 rounded-full mt-1 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${isCurrentDay ? 'bg-white' : 'bg-purple-400'}`}
                        style={{ width: `${stats.subtasks > 0 ? (stats.completedSubtasks / stats.subtasks) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className={`text-xs mt-1 ${isCurrentDay ? 'text-purple-200' : 'text-gray-500 dark:text-gray-500'}`}>
                    —
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Today's tasks detail */}
        {getSubtasksForDay(new Date()).length > 0 && (
          <div className="mt-4 pt-4 border-t border-purple-100 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-500" />
              Today's Steps
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {getSubtasksForDay(new Date()).map((subtask, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                    subtask.completed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-purple-50 dark:bg-purple-900/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {subtask.completed ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-purple-300" />
                    )}
                    <div>
                      <p className={subtask.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}>
                        {subtask.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{subtask.taskTitle}</p>
                    </div>
                  </div>
                  {subtask.estimated_minutes && (
                    <Badge variant="outline" className="text-xs">
                      {subtask.estimated_minutes}m
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 text-center">
          <Link to={createPageUrl("Tasks")}>
            <Button variant="outline" size="sm" className="text-purple-600 border-purple-200">
              Manage Tasks & Schedule
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}