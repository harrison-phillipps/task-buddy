import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Target } from "lucide-react";

const COLORS = {
  easy: "#10B981",
  medium: "#F59E0B",
  hard: "#EF4444"
};

export default function DifficultyChart({ tasks }) {
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const allTasks = tasks;
  
  const difficultyData = ['easy', 'medium', 'hard'].map(difficulty => {
    const completed = completedTasks.filter(t => (t.difficulty || 'medium') === difficulty).length;
    const total = allTasks.filter(t => (t.difficulty || 'medium') === difficulty).length;
    return {
      name: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
      completed,
      total,
      pending: total - completed,
      color: COLORS[difficulty]
    };
  });

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="w-5 h-5 text-purple-600" />
          Tasks by Difficulty
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={difficultyData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={70} />
              <Tooltip 
                formatter={(value, name) => [value, name === 'completed' ? 'Completed' : 'Pending']}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '8px',
                  border: '1px solid #E9D5FF'
                }}
              />
              <Bar dataKey="completed" stackId="a" radius={[0, 0, 0, 0]}>
                {difficultyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
              <Bar dataKey="pending" stackId="a" fill="#E5E7EB" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-xs text-gray-600">Easy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span className="text-xs text-gray-600">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-xs text-gray-600">Hard</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}