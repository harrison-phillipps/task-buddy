import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Clock } from "lucide-react";

export default function PeakHoursChart({ focusSessions }) {
  // Aggregate sessions by hour
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const sessionsInHour = focusSessions.filter(s => {
      if (!s.created_date) return false;
      const sessionHour = new Date(s.created_date).getHours();
      return sessionHour === hour;
    });

    const totalMinutes = sessionsInHour.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

    return {
      hour,
      label: hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`,
      minutes: totalMinutes,
      sessions: sessionsInHour.length
    };
  });

  // Find peak hour
  const maxMinutes = Math.max(...hourlyData.map(h => h.minutes));
  const peakHour = hourlyData.find(h => h.minutes === maxMinutes);

  // Only show hours with activity or typical working hours (6am - 11pm)
  const relevantHours = hourlyData.filter(h => h.hour >= 6 && h.hour <= 23);

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-purple-600" />
            Peak Productivity Hours
          </CardTitle>
          {peakHour && peakHour.minutes > 0 && (
            <div className="text-right">
              <span className="text-xs text-gray-500">Peak time</span>
              <p className="text-sm font-semibold text-purple-600">{peakHour.label}</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={relevantHours}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 10 }}
                tickLine={false}
                interval={1}
              />
              <YAxis 
                tick={{ fontSize: 11 }} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => `${Math.round(value)}m`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '8px',
                  border: '1px solid #E9D5FF'
                }}
                formatter={(value, name) => [`${value} minutes`, 'Focus Time']}
              />
              <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                {relevantHours.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.minutes === maxMinutes && maxMinutes > 0 
                      ? '#8B5CF6' 
                      : entry.minutes > 0 
                        ? '#C4B5FD' 
                        : '#E5E7EB'
                    } 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {focusSessions.length === 0 && (
          <p className="text-center text-gray-500 text-sm mt-2">
            Complete focus sessions to see your peak hours
          </p>
        )}
      </CardContent>
    </Card>
  );
}