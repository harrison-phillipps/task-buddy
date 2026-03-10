import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarPlus, CheckCircle2, Coffee, Utensils, Clock, Zap } from "lucide-react";
import { motion } from "framer-motion";

const typeConfig = {
  focus: {
    urgent: { border: "border-l-red-500", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800", dot: "bg-red-500", badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
    high:   { border: "border-l-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800", dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" },
    medium: { border: "border-l-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
    low:    { border: "border-l-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800", dot: "bg-blue-500", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  },
  break: { border: "border-l-green-400", bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800", dot: "bg-green-400", badge: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
  lunch: { border: "border-l-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800", dot: "bg-amber-400", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
};

function getConfig(block) {
  if (block.type === "break") return typeConfig.break;
  if (block.type === "lunch") return typeConfig.lunch;
  return typeConfig.focus[block.priority] || typeConfig.focus.medium;
}

function BlockIcon({ type }) {
  if (type === "lunch") return <Utensils className="w-4 h-4" />;
  if (type === "break") return <Coffee className="w-4 h-4" />;
  return <Zap className="w-4 h-4" />;
}

export default function ScheduleBlock({ block, index, isAdded, onAdd }) {
  const cfg = getConfig(block);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex gap-4 items-start p-4 rounded-xl border border-l-4 ${cfg.border} ${cfg.bg} transition-all`}
    >
      {/* Time column */}
      <div className="flex-shrink-0 w-28 text-center">
        <p className="font-bold text-sm text-gray-800 dark:text-gray-100">{block.start_time}</p>
        <div className="w-full h-px bg-gray-300 dark:bg-gray-600 my-1" />
        <p className="text-xs text-gray-500 dark:text-gray-400">{block.end_time}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{block.duration_minutes}m</p>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <BlockIcon type={block.type} />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{block.title}</h3>
        </div>
        {block.reason && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">{block.reason}</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {block.priority && block.type === "focus" && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>{block.priority}</span>
          )}
          {block.category && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{block.category}</span>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="flex-shrink-0">
        {isAdded ? (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>Added</span>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAdd(block)}
            className="text-xs gap-1 whitespace-nowrap dark:border-gray-600 dark:text-gray-200"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Block time
          </Button>
        )}
      </div>
    </motion.div>
  );
}