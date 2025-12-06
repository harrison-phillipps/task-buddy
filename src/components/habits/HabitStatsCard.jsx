import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, CheckCircle, Flame, Target } from "lucide-react";
import { motion } from "framer-motion";

export default function HabitStatsCard({ totalActiveHabits, completedToday, totalStreaks, habits, completions }) {
  const completionRate = totalActiveHabits > 0 ? Math.round((completedToday / totalActiveHabits) * 100) : 0;
  
  const getLast30DaysCompletions = () => {
    let count = 0;
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      habits.forEach(habit => {
        const completed = completions.some(c => 
          c.habit_id === habit.id && c.completion_date === dateStr
        );
        if (completed) count++;
      });
    }
    return count;
  };

  const last30DaysCompletions = getLast30DaysCompletions();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
    >
      <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-600" />
            Today's Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-gray-900">
            {completedToday}/{totalActiveHabits}
          </p>
          <p className="text-sm text-gray-500 mt-1">{completionRate}% complete</p>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-600" />
            Active Streaks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-gray-900">{totalStreaks}</p>
          <p className="text-sm text-gray-500 mt-1">combined days</p>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-gray-900">{last30DaysCompletions}</p>
          <p className="text-sm text-gray-500 mt-1">completions</p>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            Active Habits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-gray-900">{totalActiveHabits}</p>
          <p className="text-sm text-gray-500 mt-1">tracking now</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}