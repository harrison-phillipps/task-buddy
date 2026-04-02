import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Clock, Zap, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SmartTaskRecommender({ tasks, userProgress, currentUser }) {
  const [recommendations, setRecommendations] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const generateRecommendations = async () => {
      if (!tasks || tasks.length === 0 || !currentUser) return;

      setIsLoading(true);
      try {
        const now = new Date();
        const hourOfDay = now.getHours();
        const timeOfDay = hourOfDay < 12 ? "morning" : hourOfDay < 17 ? "afternoon" : "evening";
        
        const userLevel = Math.floor((userProgress?.total_points || 0) / 200) + 1;
        const recentCompletions = userProgress?.tasks_completed || 0;

        const pendingTasks = tasks.filter(t => t.status !== 'completed');
        
        const prompt = `You are an AI task prioritization expert helping someone with ADHD choose their next task.

CONTEXT:
- Time: ${timeOfDay} (${hourOfDay}:00)
- User level: ${userLevel}
- Recent completions: ${recentCompletions}
- Companion: ${currentUser.companion_type || "robot"}
- Energy preference: Based on time of day

PENDING TASKS:
${pendingTasks.slice(0, 15).map((t, i) => 
  `${i + 1}. "${t.title}" - ${t.category}, ${t.difficulty} difficulty, ${t.energy_level_needed} energy, ${t.estimated_minutes || 30}min, ${t.subtasks?.length || 0} subtasks${t.task_priority ? `, ${t.task_priority}` : ""}`
).join('\n')}

Analyze and recommend:
1. BEST NEXT TASK - The single best task to start right now based on:
   - Time of day energy patterns
   - Task characteristics
   - Quick win potential
   - MoSCoW priority
   
2. QUICK WIN - An easy task for momentum (5-15 min, easy difficulty)

3. CHALLENGING TASK - For when they feel energized (requires focus)

For each, explain WHY in one brief sentence. Focus on psychological factors (momentum, energy, satisfaction).`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              best_next: {
                type: "object",
                properties: {
                  task_title: { type: "string" },
                  reason: { type: "string" },
                  estimated_time: { type: "number" }
                }
              },
              quick_win: {
                type: "object",
                properties: {
                  task_title: { type: "string" },
                  reason: { type: "string" },
                  estimated_time: { type: "number" }
                }
              },
              challenging: {
                type: "object",
                properties: {
                  task_title: { type: "string" },
                  reason: { type: "string" },
                  estimated_time: { type: "number" }
                }
              }
            }
          }
        });

        setRecommendations(result);
      } catch (error) {
        console.error("Error generating recommendations:", error);
      }
      setIsLoading(false);
    };

    generateRecommendations();
  }, [tasks, userProgress, currentUser]);

  const findTaskByTitle = (title) => {
    return tasks.find(t => t.title.toLowerCase().includes(title.toLowerCase()) || title.toLowerCase().includes(t.title.toLowerCase()));
  };

  const handleStartTask = (taskTitle) => {
    const task = findTaskByTitle(taskTitle);
    if (task) {
      navigate(createPageUrl("FocusSession") + `?taskId=${task.id}`);
    }
  };

  if (isLoading || !recommendations) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-gradient-to-br from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 border-purple-200 dark:border-purple-800 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Task Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Best Next Task */}
          <div className="p-4 bg-white dark:bg-gray-700 rounded-xl border-2 border-purple-300 dark:border-purple-600 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <Badge className="bg-gradient-to-r from-purple-500 to-teal-500 text-white">
                Best Next Task
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1 dark:border-gray-500 dark:text-gray-200">
                <Clock className="w-3 h-3" />
                {recommendations.best_next.estimated_time}m
              </Badge>
            </div>
            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2">
              {recommendations.best_next.task_title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              {recommendations.best_next.reason}
            </p>
            <Button
              onClick={() => handleStartTask(recommendations.best_next.task_title)}
              className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600"
            >
              Start Now <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Quick Win & Challenging in a grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-green-500 text-white text-xs">Quick Win</Badge>
                <span className="text-xs text-gray-600 dark:text-gray-400">{recommendations.quick_win.estimated_time}m</span>
              </div>
              <h5 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">
                {recommendations.quick_win.task_title}
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                {recommendations.quick_win.reason}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStartTask(recommendations.quick_win.task_title)}
                className="w-full text-xs"
              >
                Start <Zap className="w-3 h-3 ml-1" />
              </Button>
            </div>

            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-orange-500 text-white text-xs">Challenge</Badge>
                <span className="text-xs text-gray-600 dark:text-gray-400">{recommendations.challenging.estimated_time}m</span>
              </div>
              <h5 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">
                {recommendations.challenging.task_title}
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                {recommendations.challenging.reason}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStartTask(recommendations.challenging.task_title)}
                className="w-full text-xs"
              >
                Start <TrendingUp className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}