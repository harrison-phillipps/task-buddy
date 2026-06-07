import React from "react";
import { motion } from "framer-motion";

/**
 * StreakDisplay
 * Props:
 *   streak: number — current streak days
 *   maxVisible: number — max flames to show (default 7)
 *   justCompleted: boolean — whether today's session just finished (glowing last flame)
 */
export default function StreakDisplay({ streak = 0, maxVisible = 7, justCompleted = true }) {
  if (streak === 0 && !justCompleted) return null;

  const displayCount = Math.min(streak, maxVisible);
  const hasOverflow = streak > maxVisible;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: displayCount }, (_, i) => {
          const isToday = i === displayCount - 1;
          return (
            <motion.span
              key={i}
              initial={isToday ? { scale: 0.4, opacity: 0 } : { scale: 1, opacity: 0.85 }}
              animate={
                isToday
                  ? { scale: [0.4, 1.4, 1], opacity: 1 }
                  : { scale: 1, opacity: 0.85 }
              }
              transition={
                isToday
                  ? { type: "spring", stiffness: 300, damping: 12, delay: 0.1 * i }
                  : { delay: 0.06 * i }
              }
              className={`select-none ${isToday ? "text-3xl" : "text-2xl"}`}
              style={
                isToday
                  ? {
                      filter: "drop-shadow(0 0 8px #f97316) drop-shadow(0 0 16px #fb923c)",
                    }
                  : { filter: "drop-shadow(0 0 3px #f97316)" }
              }
            >
              🔥
            </motion.span>
          );
        })}
        {hasOverflow && (
          <span className="text-sm font-bold text-orange-500 ml-1">+{streak - maxVisible}</span>
        )}
      </div>
      <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
        {streak === 1 ? "1 day streak — keep it going!" : `${streak} day streak`}
      </p>
    </div>
  );
}