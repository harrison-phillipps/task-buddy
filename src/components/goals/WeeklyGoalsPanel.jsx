import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, Circle, Repeat, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfWeek, endOfWeek } from "date-fns";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function WeeklyGoalsPanel() {
  const queryClient = useQueryClient();
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]); // Mon-Fri default
  const [adding, setAdding] = useState(false);

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: weeklyGoals = [] } = useQuery({
    queryKey: ["goals", "weekly"],
    queryFn: () => base44.entities.Goal.filter({ type: "milestone" }, "-created_date"),
    select: (data) => data.filter(g =>
      g.recurrence_pattern === "weekly" || g.description?.includes("[weekly-goal]")
    ),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Goal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", "weekly"] });
      setNewGoalTitle("");
      setAdding(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Goal.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals", "weekly"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Goal.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals", "weekly"] }),
  });

  const handleAdd = () => {
    if (!newGoalTitle.trim()) return;
    createMutation.mutate({
      title: newGoalTitle.trim(),
      type: "milestone",
      description: `[weekly-goal] Repeat on: ${selectedDays.map(d => DAYS[d]).join(", ")}`,
      status: "not_started",
      priority: "medium",
      recurrence_pattern: "weekly",
      recurrence_days: selectedDays,
    });
  };

  const toggleDay = (day) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleComplete = (goal) => {
    const isDone = goal.status === "completed";
    updateMutation.mutate({ id: goal.id, data: { status: isDone ? "not_started" : "completed" } });
  };

  const completedCount = weeklyGoals.filter(g => g.status === "completed").length;
  const total = weeklyGoals.length;

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-300">
            <Repeat className="w-5 h-5" />
            Weekly Goals
            <Badge className="bg-purple-100 text-purple-700 text-xs ml-1">Pro</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {total > 0 && (
              <span className="text-sm text-gray-600 dark:text-gray-400">{completedCount}/{total} done this week</span>
            )}
            <Button size="sm" variant="outline" className="border-purple-200" onClick={() => setAdding(!adding)}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500">Week of {format(startOfWeek(new Date(), { weekStartsOn: 1 }), "MMM d")} – {format(endOfWeek(new Date(), { weekStartsOn: 1 }), "MMM d")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-purple-200"
            >
              <Input
                placeholder="e.g. Exercise for 30 mins"
                value={newGoalTitle}
                onChange={e => setNewGoalTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                autoFocus
              />
              <div>
                <p className="text-xs text-gray-500 mb-2">Repeat on:</p>
                <div className="flex gap-1 flex-wrap">
                  {DAYS.map((day, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
                        selectedDays.includes(i)
                          ? "bg-purple-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-purple-100"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setAdding(false)} className="flex-1">Cancel</Button>
                <Button size="sm" onClick={handleAdd} disabled={!newGoalTitle.trim() || createMutation.isPending} className="flex-1 bg-purple-500 hover:bg-purple-600 text-white">
                  Save Goal
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {weeklyGoals.length === 0 && !adding ? (
          <div className="text-center py-6 text-gray-500">
            <Repeat className="w-10 h-10 mx-auto mb-2 text-purple-300" />
            <p className="text-sm">No weekly goals yet. Add one to build consistent habits!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {weeklyGoals.map(goal => {
              const done = goal.status === "completed";
              // Parse repeat days from description
              const repeatDays = goal.recurrence_days || [];
              return (
                <motion.div
                  key={goal.id}
                  layout
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    done ? "bg-green-50 border-green-200 dark:bg-green-900/20" : "bg-white dark:bg-gray-800/60 border-gray-200"
                  }`}
                >
                  <button onClick={() => toggleComplete(goal)}>
                    {done
                      ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                      : <Circle className="w-5 h-5 text-gray-400 hover:text-purple-500 transition-colors" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${done ? "line-through text-gray-400" : "text-gray-900 dark:text-gray-100"}`}>
                      {goal.title}
                    </p>
                    {repeatDays.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {DAYS.map((day, i) => (
                          <span key={i} className={`text-[10px] px-1 rounded ${repeatDays.includes(i) ? "bg-purple-100 text-purple-700" : "text-transparent"}`}>
                            {repeatDays.includes(i) ? day : "."}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(goal.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {total > 0 && (
          <div className="pt-1">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <motion.div
                className="bg-gradient-to-r from-purple-500 to-teal-500 h-1.5 rounded-full"
                animate={{ width: `${total > 0 ? (completedCount / total) * 100 : 0}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}