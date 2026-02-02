import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Sparkles, 
  RefreshCw, 
  CheckCircle, 
  Clock,
  Zap,
  Coffee,
  Sun,
  Moon,
  TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";

const energyIcons = {
  high: { icon: Zap, color: "text-yellow-500", label: "High Energy" },
  medium: { icon: TrendingUp, color: "text-blue-500", label: "Medium Energy" },
  low: { icon: Coffee, color: "text-orange-500", label: "Low Energy" }
};

const timeBlocks = [
  { id: "morning", label: "Morning (6am-12pm)", icon: Sun, typical_energy: "high" },
  { id: "afternoon", label: "Afternoon (12pm-6pm)", icon: Sun, typical_energy: "medium" },
  { id: "evening", label: "Evening (6pm-12am)", icon: Moon, typical_energy: "low" }
];

export default function AIDailyPlanner({ tasks, sessions, userProgress, currentUser }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [planType, setPlanType] = useState('daily'); // 'daily' or 'weekly'

  useEffect(() => {
    generatePlan();
  }, []);

  const generatePlan = async () => {
    if (!currentUser || loading) return;

    setLoading(true);

    try {
      const incompleteTasks = tasks.filter(t => t.status !== 'completed');
      
      // Analyze energy patterns from past sessions
      const energyPatterns = analyzeEnergyPatterns(sessions);
      
      // Get current context
      const currentHour = new Date().getHours();
      const currentTimeBlock = currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening';

      const tasksContext = incompleteTasks.slice(0, 15).map(t => ({
        title: t.title,
        difficulty: t.difficulty,
        estimated_minutes: t.estimated_minutes,
        due_date: t.due_date,
        priority: t.priority,
        energy_level_needed: t.energy_level_needed,
        category: t.category
      }));

      const prompt = planType === 'daily' 
        ? `You are TaskBuddy's AI daily planner. Create a personalized daily plan for the user.

Current Context:
- Time: ${currentTimeBlock}
- Tasks available: ${incompleteTasks.length}
- User level: ${userProgress?.level || 1}
- Current streak: ${userProgress?.current_streak || 0}

Energy Patterns:
${energyPatterns}

Tasks to schedule:
${JSON.stringify(tasksContext, null, 2)}

Create an optimal daily plan that:
1. Schedules high-difficulty tasks during high-energy times (typically morning)
2. Places easier/administrative tasks during lower-energy times
3. Respects task deadlines and priorities
4. Includes break suggestions
5. Balances different task categories
6. Provides a motivational insight about the plan

Group tasks by time blocks (morning, afternoon, evening) with estimated completion times.
Provide reasoning for the schedule based on energy optimization.`
        : `You are TaskBuddy's AI weekly planner. Create a strategic weekly plan.

Context:
- Week start: ${new Date().toLocaleDateString()}
- Total tasks: ${incompleteTasks.length}
- User level: ${userProgress?.level || 1}

Tasks overview:
${JSON.stringify(tasksContext, null, 2)}

Create a weekly plan that:
1. Distributes tasks across days based on deadlines
2. Balances workload throughout the week
3. Suggests focus themes for each day
4. Identifies key priorities
5. Provides weekly goals and milestones

Group by days with daily themes and task allocations.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            plan_date: { type: "string" },
            motivational_insight: { type: "string" },
            time_blocks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  block_name: { type: "string" },
                  energy_level: { type: "string" },
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        task_title: { type: "string" },
                        estimated_time: { type: "string" },
                        reason: { type: "string" }
                      }
                    }
                  },
                  break_suggestion: { type: "string" }
                }
              }
            },
            optimization_notes: { type: "string" }
          }
        }
      });

      setPlan(response);
    } catch (error) {
      console.error("Error generating plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeEnergyPatterns = (sessions) => {
    const morningMood = sessions.filter(s => {
      const hour = new Date(s.created_date).getHours();
      return hour >= 6 && hour < 12;
    });
    const afternoonMood = sessions.filter(s => {
      const hour = new Date(s.created_date).getHours();
      return hour >= 12 && hour < 18;
    });

    return `Morning sessions: ${morningMood.length} (avg mood: ${morningMood.length > 0 ? 'focused' : 'unknown'})
Afternoon sessions: ${afternoonMood.length}
Peak productivity time: ${morningMood.length > afternoonMood.length ? 'Morning' : 'Afternoon'}`;
  };

  if (loading) {
    return (
      <Card className="border-purple-200 dark:border-purple-700 dark:bg-gray-800">
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-700 dark:text-gray-300 font-medium">
            Creating your personalized {planType} plan...
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Analyzing your energy patterns and task priorities
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!plan) return null;

  return (
    <Card className="border-purple-200 dark:border-purple-700 dark:bg-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            AI {planType === 'daily' ? 'Daily' : 'Weekly'} Plan
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={planType === 'daily' ? 'default' : 'outline'}
              onClick={() => { setPlanType('daily'); setPlan(null); }}
              className={planType === 'daily' ? 'bg-purple-500 text-white' : ''}
            >
              Daily
            </Button>
            <Button
              size="sm"
              variant={planType === 'weekly' ? 'default' : 'outline'}
              onClick={() => { setPlanType('weekly'); setPlan(null); }}
              className={planType === 'weekly' ? 'bg-purple-500 text-white' : ''}
            >
              Weekly
            </Button>
            <Button size="sm" variant="ghost" onClick={generatePlan}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Motivational Insight */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
          <div className="flex items-start gap-2">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {plan.motivational_insight}
            </p>
          </div>
        </div>

        {/* Time Blocks */}
        <div className="space-y-4">
          {plan.time_blocks?.map((block, idx) => {
            const energyConfig = energyIcons[block.energy_level] || energyIcons.medium;
            const EnergyIcon = energyConfig.icon;
            
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 bg-gradient-to-br from-purple-100 to-teal-100 dark:from-purple-900/30 dark:to-teal-900/30 rounded-lg flex items-center justify-center`}>
                    <EnergyIcon className={`w-4 h-4 ${energyConfig.color}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">{block.block_name}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{energyConfig.label}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {block.tasks?.map((task, tidx) => (
                    <div key={tidx} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-600 rounded">
                      <CheckCircle className="w-4 h-4 text-purple-500 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{task.task_title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {task.estimated_time}
                          </Badge>
                          <span className="text-xs text-gray-600 dark:text-gray-400">{task.reason}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {block.break_suggestion && (
                  <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                    <Coffee className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 dark:text-blue-200">{block.break_suggestion}</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Optimization Notes */}
        {plan.optimization_notes && (
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-gray-100">Energy Optimization:</strong> {plan.optimization_notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}