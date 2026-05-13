import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Zap, Target, Clock } from "lucide-react";
import { motion } from "framer-motion";

function ScoreRing({ score }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "#14B8A6" : score >= 50 ? "#8B5CF6" : "#FB7185";

  return (
    <svg width="100" height="100" className="mx-auto">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
      <motion.circle
        cx="50" cy="50" r={radius}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="55" textAnchor="middle" fontSize="18" fontWeight="bold" fill={color}>
        {score}
      </text>
    </svg>
  );
}

export default function ProductivityScore({ tasks = [], focusSessions = [], userProgress }) {
  // Calculate a composite score from real data
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const totalTasks = tasks.length || 1;
  const completionRate = Math.min(completedTasks / totalTasks, 1);

  const totalFocusMinutes = focusSessions.reduce((s, f) => s + (f.duration_minutes || 0), 0);
  const focusScore = Math.min(totalFocusMinutes / 300, 1); // 5h = max

  const streak = userProgress?.current_streak || 0;
  const streakScore = Math.min(streak / 14, 1); // 14-day streak = max

  const score = Math.round((completionRate * 40 + focusScore * 35 + streakScore * 25) * 100);

  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Building" : "Getting Started";
  const labelColor = score >= 80 ? "text-teal-600" : score >= 60 ? "text-purple-600" : score >= 40 ? "text-orange-500" : "text-pink-500";

  const factors = [
    { label: "Task Completion", value: Math.round(completionRate * 100) + "%", icon: Target, color: "text-purple-600" },
    { label: "Focus Time", value: Math.round(totalFocusMinutes / 60) + "h", icon: Clock, color: "text-teal-600" },
    { label: "Streak", value: streak + " days", icon: Zap, color: "text-orange-500" },
  ];

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-300">
          <TrendingUp className="w-5 h-5" />
          Productivity Score
          <span className="text-xs font-normal bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ml-auto">Pro</span>
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">Your composite performance across tasks, focus & streaks</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="text-center">
            <ScoreRing score={score} />
            <p className={`font-bold text-lg mt-1 ${labelColor}`}>{label}</p>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-4 w-full">
            {factors.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white dark:bg-gray-800/60 rounded-xl p-3 text-center shadow-sm">
                <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4 text-center">Score updates as you complete tasks and focus sessions</p>
      </CardContent>
    </Card>
  );
}