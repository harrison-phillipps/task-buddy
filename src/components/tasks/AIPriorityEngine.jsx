import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, List, Pin, PinOff, ChevronDown, ChevronUp, Info, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getAIPriorityColor, getAIPriorityLabel, getUrgencyIcon } from "../ai/TaskPrioritizer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AIPriorityViewToggle({ viewMode, onToggle, isAnalyzing, hasAIData, onRunAI, aiStrategy, aiRecommendedFocus, aiStrategy: strategy }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center bg-white dark:bg-gray-800 border border-purple-200 dark:border-gray-600 rounded-xl p-1 shadow-sm">
        <button
          onClick={() => onToggle("manual")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            viewMode === "manual"
              ? "bg-gradient-to-r from-purple-500 to-teal-500 text-white shadow-md"
              : "text-gray-600 dark:text-gray-400 hover:text-purple-600"
          }`}
        >
          <List className="w-3.5 h-3.5" />
          Manual
        </button>
        <button
          onClick={() => viewMode !== "ai" ? onToggle("ai") : null}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            viewMode === "ai"
              ? "bg-gradient-to-r from-purple-500 to-teal-500 text-white shadow-md"
              : "text-gray-600 dark:text-gray-400 hover:text-purple-600"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI View
        </button>
      </div>

      {viewMode === "ai" && !hasAIData && (
        <Button
          size="sm"
          onClick={onRunAI}
          disabled={isAnalyzing}
          className="bg-gradient-to-r from-purple-500 to-teal-500 text-white border-none"
        >
          {isAnalyzing ? (
            <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Analyzing...</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Run AI Analysis</>
          )}
        </Button>
      )}

      {viewMode === "ai" && hasAIData && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRunAI}
          disabled={isAnalyzing}
          className="border-purple-200 text-purple-700"
        >
          {isAnalyzing ? (
            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          )}
          Re-analyze
        </Button>
      )}
    </div>
  );
}

export function AIStrategyBanner({ strategy, recommendedFocus, onDismiss }) {
  const [expanded, setExpanded] = useState(false);
  if (!strategy) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4"
    >
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">AI Strategy</h3>
            <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 line-clamp-2">{strategy}</p>
          <AnimatePresence>
            {expanded && recommendedFocus && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-700"
              >
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1">🎯 Recommended Focus</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{recommendedFocus}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0">✕</button>
      </div>
    </motion.div>
  );
}

export function AIPriorityScoreBadge({ task, showRationale = false }) {
  const [open, setOpen] = useState(false);
  const score = task.ai_priority_score;
  if (score === undefined) return null;

  const gradient = getAIPriorityColor(score);
  const label = getAIPriorityLabel(score);
  const urgencyIcon = getUrgencyIcon(task.ai_urgency_level);

  return (
    <div className="relative">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => showRationale && setOpen(o => !o)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${gradient} cursor-${showRationale ? 'pointer' : 'default'} shadow-sm`}
            >
              <Sparkles className="w-2.5 h-2.5" />
              {score} {urgencyIcon}
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold text-sm mb-1">{label}</p>
            {task.ai_reasoning && <p className="text-xs text-gray-300">{task.ai_reasoning}</p>}
            <div className="mt-1.5 flex gap-2 text-xs text-gray-400">
              <span>⏰ {task.ai_best_time}</span>
              <span>⚡ {task.ai_energy_match}</span>
            </div>
            {showRationale && <p className="text-xs text-purple-300 mt-1">Click for full rationale</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            className="absolute top-7 left-0 z-30 w-72"
          >
            <Card className="shadow-xl border-purple-200 dark:border-purple-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                    {label} — Score: {score}/100
                  </span>
                  <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{task.ai_reasoning}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                    <span className="text-gray-500 dark:text-gray-400 block mb-0.5">Best Time</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">{task.ai_best_time}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                    <span className="text-gray-500 dark:text-gray-400 block mb-0.5">Energy Match</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">{task.ai_energy_match}</span>
                  </div>
                </div>
                {/* Score breakdown bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Priority Score</span>
                    <span>{score}/100</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.6 }}
                      className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PinButton({ isPinned, onToggle }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onToggle}
            className={`p-1 rounded-lg transition-all ${
              isPinned
                ? "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40"
                : "text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            }`}
          >
            {isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{isPinned ? "Unpin task" : "Pin to top"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AIStrategySelector({ value, onChange }) {
  return (
    <Select value={value || "balanced"} onValueChange={onChange}>
      <SelectTrigger className="w-48 h-8 text-xs border-purple-200 dark:border-purple-700">
        <Zap className="w-3 h-3 mr-1.5 text-purple-500" />
        <SelectValue placeholder="AI Strategy" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="balanced">⚖️ Balanced</SelectItem>
        <SelectItem value="deadline_first">🚨 Deadline First</SelectItem>
        <SelectItem value="quick_wins">⚡ Quick Wins</SelectItem>
        <SelectItem value="high_impact">💥 High Impact</SelectItem>
        <SelectItem value="energy_aware">🔋 Energy Aware</SelectItem>
      </SelectContent>
    </Select>
  );
}

export const STRATEGY_PROMPTS = {
  balanced: "Use a balanced approach considering deadlines, impact, energy, and user patterns equally.",
  deadline_first: "Prioritize tasks with the nearest deadlines above all else.",
  quick_wins: "Prioritize shorter, easier tasks to build momentum and increase completion rate.",
  high_impact: "Prioritize tasks with the highest potential impact on goals, regardless of difficulty.",
  energy_aware: "Match tasks to the user's energy patterns and time of day for optimal performance.",
};