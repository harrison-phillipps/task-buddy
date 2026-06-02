import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SmartTaskRecommender({ tasks, userProgress, currentUser }) {
  const [recommendation, setRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const generate = async () => {
      if (!tasks || tasks.length === 0 || !currentUser) return;
      setIsLoading(true);
      try {
        const now = new Date();
        const hourOfDay = now.getHours();
        const timeOfDay = hourOfDay < 12 ? "morning" : hourOfDay < 17 ? "afternoon" : "evening";
        const pendingTasks = tasks.filter(t => t.status !== 'completed');

        const prompt = `You are a task prioritization expert. Pick the single best task to start RIGHT NOW.

CONTEXT: ${timeOfDay} (${hourOfDay}:00)

TASKS:
${pendingTasks.slice(0, 15).map((t, i) =>
  `${i + 1}. "${t.title}" — ${t.energy_level_needed || "medium"} energy, ${t.estimated_minutes || 30}min${t.task_priority ? `, ${t.task_priority}` : ""}${t.due_date ? `, due ${t.due_date}` : ""}`
).join('\n')}

Return ONLY:
- task_title: exact title from the list
- estimated_time: number in minutes
- short_label: MAX 4 words describing why (e.g. "Low energy · quick win", "High impact · 10 min", "Quick win · high priority"). No sentences. No verbs. Just descriptive tags separated by ·. NEVER use the word "Overdue".`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              task_title: { type: "string" },
              estimated_time: { type: "number" },
              short_label: { type: "string" }
            }
          }
        });

        setRecommendation(result);
      } catch (error) {
        console.error("SmartTaskRecommender error:", error);
      }
      setIsLoading(false);
    };
    generate();
  }, [tasks, currentUser]);

  const handleStart = () => {
    const task = tasks.find(t =>
      t.title.toLowerCase().includes(recommendation.task_title.toLowerCase()) ||
      recommendation.task_title.toLowerCase().includes(t.title.toLowerCase())
    );
    if (task) navigate(createPageUrl("FocusSession") + `?taskId=${task.id}`);
  };

  if (isLoading || !recommendation) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="bg-gradient-to-br from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Best Next Task</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-gray-100 text-base leading-snug mb-1">
                {recommendation.task_title}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>{recommendation.estimated_time}m</span>
                {recommendation.short_label && (
                  <>
                    <span>·</span>
                    <span>{recommendation.short_label}</span>
                  </>
                )}
              </div>
            </div>
            <Button
              onClick={handleStart}
              size="sm"
              className="flex-shrink-0 bg-gradient-to-r from-purple-500 to-teal-500 text-white border-none"
            >
              Start <ChevronRight className="w-4 h-4 ml-0.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}