import React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Play, PauseCircle } from "lucide-react";

/**
 * In-app way back into a session on a day a nudge went out.
 *
 * The native shell has no deep-link handler, so the push itself cannot open this
 * page — the card is what does. Task titles are fine here; they never appear on
 * the lock screen.
 */
export default function FocusNudgeCard({ paused = false, onStart }) {
  if (paused) {
    return (
      <div className="rounded-2xl border border-purple-100 dark:border-purple-900 bg-white dark:bg-gray-800 px-4 py-3 flex items-start gap-3">
        <PauseCircle className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
        <p className="text-sm text-gray-600 dark:text-gray-300">
          We've paused your focus nudge. You can turn it back on in Settings.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-teal-50 dark:from-purple-950/40 dark:to-teal-950/30 px-4 py-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shrink-0">
          <Play className="w-4 h-4 text-purple-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">Start a 10-minute session</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Ten minutes, whenever you're ready.
          </p>
        </div>
      </div>
      <Button onClick={onStart} className="w-full bg-gradient-to-r from-purple-500 to-teal-500 text-white">
        Start a 10-minute session
      </Button>
    </motion.div>
  );
}