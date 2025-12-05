import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

export default function WeeklyTrendsChart({ tasks, focusSessions }) {
  // Generate last 14 days of data
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i);
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const tasksCompleted = tasks.filter(t => {
      if (t.status !== 'completed' || !t.updated_date) return false;
      const taskDate = new Date(t.updated_date);
      return taskDate >= dayStart && taskDate < dayEnd;
    }).length;

    const focusMinutes = focusSessions
      .filter(s => {
        if (!s.created_date) return false;
        const sessionDate = new Date(s.created_date);
        return sessionDate >= dayStart && sessionDate < dayEnd;
      })
      .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

    return {
      date: format(date, 'MMM d'),
      shortDate: format(date, 'EEE'),
      tasks: tasksCompleted,
      focusHours: Math.round(focusMinutes / 60 * 10) / 10
    };
  });

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          14-Day Productivity Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last14Days}>
              <defs>
                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#14B8A6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="shortDate" 
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '8px',
                  border: '1px solid #E9D5FF'
                }}
                formatter={(value, name) => [
                  value, 
                  name === 'tasks' ? 'Tasks Completed' : 'Focus Hours'
                ]}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
              />
              <Area 
                type="monotone" 
                dataKey="tasks" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorTasks)" 
              />
              <Area 
                type="monotone" 
                dataKey="focusHours" 
                stroke="#14B8A6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorFocus)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-xs text-gray-600">Tasks Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal-500" />
            <span className="text-xs text-gray-600">Focus Hours</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}