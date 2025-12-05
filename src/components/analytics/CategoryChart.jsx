import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Layers } from "lucide-react";

const COLORS = {
  work: "#8B5CF6",
  personal: "#EC4899",
  health: "#10B981",
  creative: "#F59E0B",
  learning: "#3B82F6",
  household: "#6366F1",
  other: "#94A3B8"
};

const CATEGORY_LABELS = {
  work: "Work",
  personal: "Personal",
  health: "Health",
  creative: "Creative",
  learning: "Learning",
  household: "Household",
  other: "Other"
};

export default function CategoryChart({ tasks }) {
  const completedTasks = tasks.filter(t => t.status === 'completed');
  
  const categoryData = completedTasks.reduce((acc, task) => {
    const cat = task.category || 'other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(categoryData).map(([category, count]) => ({
    name: CATEGORY_LABELS[category] || category,
    value: count,
    color: COLORS[category] || COLORS.other
  }));

  if (chartData.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="w-5 h-5 text-purple-600" />
            Tasks by Category
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-gray-500 text-sm">Complete some tasks to see category breakdown</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layers className="w-5 h-5 text-purple-600" />
          Tasks by Category
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value} tasks`, '']}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '8px',
                  border: '1px solid #E9D5FF'
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}