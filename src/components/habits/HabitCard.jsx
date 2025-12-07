import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, TrendingUp, MoreVertical, Trash2, Edit2, Flame, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function HabitCard({ habit, completions, onComplete, onUpdate, onDelete, onViewInsights }) {
  const today = new Date().toISOString().split('T')[0];
  const todayCompletion = completions.find(c => c.completion_date === today);
  const isCompletedToday = !!todayCompletion;
  const todayCount = todayCompletion?.count || 0;

  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const completed = completions.some(c => c.completion_date === dateStr);
      days.push({ date: dateStr, completed, day: date.getDay() });
    }
    return days;
  };

  const last7Days = getLast7Days();
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 border-purple-100"
        style={{ borderTopColor: habit.color, borderTopWidth: '3px' }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-3xl">{habit.icon || '📌'}</span>
              <div className="flex-1">
                <CardTitle className="text-lg font-bold text-gray-900">
                  {habit.title}
                </CardTitle>
                {habit.description && (
                  <p className="text-sm text-gray-600 mt-1">{habit.description}</p>
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
                <DropdownMenuItem onClick={onViewInsights}>
                  <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                  AI Insights
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onUpdate({ is_active: !habit.is_active })}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  {habit.is_active ? 'Pause' : 'Activate'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {habit.frequency === 'daily' ? 'Daily' : habit.frequency === 'weekly' ? 'Weekly' : 'Custom'}
            </Badge>
            {habit.current_streak > 0 && (
              <div className="flex items-center gap-1 text-orange-600 font-bold">
                <Flame className="w-4 h-4" />
                <span className="text-sm">{habit.current_streak} day{habit.current_streak > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          <div className="flex gap-1 justify-between">
            {last7Days.map((day, index) => (
              <div key={index} className="flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500">{dayNames[day.day]}</span>
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    day.completed 
                      ? 'bg-green-500' 
                      : day.date === today
                      ? 'bg-gray-200'
                      : 'bg-gray-100'
                  }`}
                >
                  {day.completed && <CheckCircle className="w-5 h-5 text-white" />}
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={() => onComplete(today)}
            disabled={!habit.is_active || (isCompletedToday && todayCount >= habit.target_count)}
            className={`w-full ${
              isCompletedToday && todayCount >= habit.target_count
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600'
            } text-white font-semibold`}
          >
            {isCompletedToday && todayCount >= habit.target_count ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Completed {todayCount}/{habit.target_count}!
              </>
            ) : isCompletedToday ? (
              <>
                <Circle className="w-4 h-4 mr-2" />
                Mark Again ({todayCount}/{habit.target_count})
              </>
            ) : (
              <>
                <Circle className="w-4 h-4 mr-2" />
                Mark Complete
              </>
            )}
          </Button>

          <div className="flex justify-between text-xs text-gray-600 pt-2 border-t">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Best: {habit.longest_streak || 0} days</span>
            </div>
            <span>{habit.total_completions || 0} total</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}