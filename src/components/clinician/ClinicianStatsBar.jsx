import React from "react";
import { Users, FileText } from "lucide-react";

export default function ClinicianStatsBar({ clientCount, reportsThisMonth }) {
  const stats = [
    { label: "Clients Connected", value: clientCount, icon: Users, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/30" },
    { label: "Reports This Month", value: reportsThisMonth, icon: FileText, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-900/30" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((s) => (
        <div key={s.label} className={`rounded-2xl p-4 flex items-center gap-4 ${s.bg} border border-white/50 dark:border-white/10`}>
          <div className={`p-2 rounded-xl bg-white/70 dark:bg-white/10 ${s.color}`}>
            <s.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}