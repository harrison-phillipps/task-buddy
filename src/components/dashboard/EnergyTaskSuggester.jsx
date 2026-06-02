import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Zap, Clock, Play, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";

const ENERGY_LEVELS = [
  { value: 1, label: "Drained", emoji: "😴", color: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800", required: ["low"] },
  { value: 2, label: "Low", emoji: "🥱", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/30", required: ["low"] },
  { value: 3, label: "Moderate", emoji: "😊", color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-900/30", required: ["low", "medium"] },
  { value: 4, label: "High", emoji: "⚡", color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/30", required: ["low", "medium", "high"] },
  { value: 5, label: "Peak", emoji: "🔥", color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/30", required: ["low", "medium", "high"] },
];

const TIME_SLOTS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 999, label: "All day" },
];

const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

const energyBadge = {
  high:   { label: "High Energy", color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" },
  medium: { label: "Med Energy",  color: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800" },
  low:    { label: "Low Energy",  color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800" },
};

export default function EnergyTaskSuggester({ tasks = [], onStart }) {
  const [energySlider, setEnergySlider] = useState([3]);
  const [timeAvailable, setTimeAvailable] = useState(60);
  const [collapsed, setCollapsed] = useState(true);

  const energyLevel = ENERGY_LEVELS[energySlider[0] - 1];

  const activeTasks = tasks.filter(t => t.status !== "completed" && t.status !== "blocked");

  const suggested = useMemo(() => {
    return activeTasks
      .filter(t => {
        // Match energy: only show tasks the user has energy for
        const taskEnergy = t.energy_level_needed || "medium";
        if (!energyLevel.required.includes(taskEnergy)) return false;
        // Match time: if task has an estimate, it must fit in available time
        if (t.estimated_minutes && timeAvailable < 999) {
          return t.estimated_minutes <= timeAvailable;
        }
        return true;
      })
      .sort((a, b) => {
        // Sort: urgent/overdue first, then by priority, then by energy match
        const aOverdue = a.due_date && a.due_date < new Date().toISOString().split("T")[0];
        const bOverdue = b.due_date && b.due_date < new Date().toISOString().split("T")[0];
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
      })
      .slice(0, 5);
  }, [activeTasks, energyLevel, timeAvailable]);

  return (
    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-100 dark:border-gray-700">
      <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setCollapsed(v => !v)}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-100">
            <span className="text-xl">{energyLevel.emoji}</span>
            What Should I Work On?
          </CardTitle>
          {collapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
        </div>
      </CardHeader>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <CardContent className="space-y-5 pt-0">
              {/* Energy slider */}
              <div className={`rounded-xl p-4 ${energyLevel.bg} transition-colors duration-300`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    Current Energy
                  </span>
                  <span className={`text-sm font-bold ${energyLevel.color}`}>
                    {energyLevel.emoji} {energyLevel.label}
                  </span>
                </div>
                <Slider
                  value={energySlider}
                  onValueChange={setEnergySlider}
                  min={1}
                  max={5}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                  <span>😴 Drained</span>
                  <span>🔥 Peak</span>
                </div>
              </div>

              {/* Time available */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Time Available
                </p>
                <div className="flex gap-2 flex-wrap">
                  {TIME_SLOTS.map(slot => (
                    <button
                      key={slot.value}
                      onClick={() => setTimeAvailable(slot.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        timeAvailable === slot.value
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-purple-400"
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Suggested tasks */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  {suggested.length > 0 ? `${suggested.length} task${suggested.length > 1 ? "s" : ""} match your energy` : "No matching tasks"}
                </p>

                {suggested.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
                    {activeTasks.length === 0
                      ? "You have no active tasks — great work! 🎉"
                      : "Try adjusting energy level or time to see suggestions."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {suggested.map(task => {
                      const eb = energyBadge[task.energy_level_needed || "medium"];
                      const isOverdue = task.due_date && task.due_date < new Date().toISOString().split("T")[0];
                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              <Badge className={`${eb.color} border text-xs`}>{eb.label}</Badge>
                              {task.estimated_minutes && (
                                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />{task.estimated_minutes}m
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{task.title}</p>
                          </div>
                          <Link to={createPageUrl("FocusSession") + `?task=${task.id}`}>
                            <Button
                              size="sm"
                              onClick={() => onStart?.(task)}
                              className="bg-gradient-to-r from-purple-500 to-teal-500 text-white border-none flex-shrink-0"
                            >
                              <Play className="w-3.5 h-3.5 mr-1" />
                              Start
                            </Button>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}