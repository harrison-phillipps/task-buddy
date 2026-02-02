import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Battery, 
  BatteryMedium, 
  BatteryLow,
  Zap,
  Coffee,
  Sun,
  Moon,
  ThumbsUp,
  ThumbsDown,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";

const energyLevels = {
  high: { icon: Zap, color: "text-yellow-500", bg: "from-yellow-500 to-orange-500", label: "High Energy" },
  medium: { icon: BatteryMedium, color: "text-blue-500", bg: "from-blue-500 to-indigo-500", label: "Medium Energy" },
  low: { icon: BatteryLow, color: "text-orange-500", bg: "from-orange-500 to-red-500", label: "Low Energy" }
};

export default function EnergyAwareCoach({ tasks, sessions, currentUser, userProgress }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  useEffect(() => {
    predictEnergy();
  }, []);

  const predictEnergy = async () => {
    setLoading(true);
    try {
      const currentHour = new Date().getHours();
      const currentTimeBlock = currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening';

      // Analyze past energy patterns
      const energyHistory = sessions.map(s => ({
        hour: new Date(s.created_date).getHours(),
        mood_before: s.mood_before,
        mood_after: s.mood_after,
        duration: s.duration_minutes,
        completed: s.completed
      }));

      // Get recent mood patterns
      const recentSessions = sessions.slice(0, 5);
      const avgMoodQuality = recentSessions.filter(s => s.mood_after === 'accomplished' || s.mood_after === 'energized').length / Math.max(recentSessions.length, 1);

      // Get current incomplete tasks
      const incompleteTasks = tasks.filter(t => t.status !== 'completed');
      const highEnergyTasks = incompleteTasks.filter(t => t.energy_level_needed === 'high' || t.difficulty === 'hard');
      const lowEnergyTasks = incompleteTasks.filter(t => t.energy_level_needed === 'low' || t.difficulty === 'easy');

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an energy management coach predicting user energy levels and suggesting task adjustments.

Current Context:
- Time: ${currentTimeBlock} (${currentHour}:00)
- Recent sessions: ${recentSessions.length}
- Avg mood quality: ${(avgMoodQuality * 100).toFixed(0)}%
- High-energy tasks available: ${highEnergyTasks.length}
- Low-energy tasks available: ${lowEnergyTasks.length}

Historical Patterns:
${energyHistory.slice(0, 10).map(h => `- ${h.hour}:00 - Mood: ${h.mood_before} → ${h.mood_after}, Duration: ${h.duration}min`).join('\n')}

Based on time of day, historical patterns, and recent mood:
1. Predict current energy level (high/medium/low)
2. Suggest which tasks to tackle now
3. Suggest which tasks to defer
4. Provide energy management tips
5. Recommend optimal work duration

Be specific and actionable.`,
        response_json_schema: {
          type: "object",
          properties: {
            predicted_energy: { 
              type: "string",
              enum: ["high", "medium", "low"]
            },
            confidence: { type: "number" },
            reasoning: { type: "string" },
            recommended_tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task_type: { type: "string" },
                  reason: { type: "string" }
                }
              }
            },
            tasks_to_defer: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task_type: { type: "string" },
                  defer_until: { type: "string" }
                }
              }
            },
            energy_tips: {
              type: "array",
              items: { type: "string" }
            },
            optimal_work_duration: { type: "string" },
            break_suggestion: { type: "string" }
          }
        }
      });

      setPrediction(response);
    } catch (error) {
      console.error("Error predicting energy:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (isAccurate) => {
    try {
      await base44.entities.CompanionFeedback.create({
        user_id: currentUser?.id,
        message_text: JSON.stringify(prediction),
        context: "energy_coach",
        rating: isAccurate ? "positive" : "negative"
      });
      setFeedbackGiven(true);
    } catch (error) {
      console.error("Error saving feedback:", error);
    }
  };

  if (loading) {
    return (
      <Card className="border-yellow-200 dark:border-yellow-700 dark:bg-gray-800">
        <CardContent className="p-8 text-center">
          <Battery className="w-8 h-8 text-yellow-600 dark:text-yellow-400 animate-pulse mx-auto mb-3" />
          <p className="text-gray-700 dark:text-gray-300 font-medium">
            Analyzing your energy patterns...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!prediction) return null;

  const energyConfig = energyLevels[prediction.predicted_energy] || energyLevels.medium;
  const EnergyIcon = energyConfig.icon;

  return (
    <Card className="border-yellow-200 dark:border-yellow-700 dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Battery className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          Energy Management Coach
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Energy Prediction */}
        <div className={`p-4 bg-gradient-to-r ${energyConfig.bg} rounded-lg text-white`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <EnergyIcon className="w-6 h-6" />
              <span className="font-bold text-lg">{energyConfig.label}</span>
            </div>
            <Badge className="bg-white/20 backdrop-blur-sm text-white border-none">
              {Math.round(prediction.confidence * 100)}% confidence
            </Badge>
          </div>
          <p className="text-sm text-white/90">{prediction.reasoning}</p>
        </div>

        {/* Recommended Tasks */}
        {prediction.recommended_tasks?.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
              Recommended Now
            </h4>
            <div className="space-y-2">
              {prediction.recommended_tasks.map((task, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700"
                >
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{task.task_type}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{task.reason}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks to Defer */}
        {prediction.tasks_to_defer?.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              Save for Later
            </h4>
            <div className="space-y-2">
              {prediction.tasks_to_defer.map((task, idx) => (
                <div 
                  key={idx}
                  className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{task.task_type}</p>
                    <Badge variant="outline" className="text-xs">{task.defer_until}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Energy Tips */}
        {prediction.energy_tips?.length > 0 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
              <Coffee className="w-4 h-4" />
              Energy Optimization Tips
            </h4>
            <ul className="space-y-1">
              {prediction.energy_tips.map((tip, idx) => (
                <li key={idx} className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Work Duration & Break */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
            <p className="text-xs font-semibold text-purple-900 dark:text-purple-100 mb-1">Optimal Duration</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{prediction.optimal_work_duration}</p>
          </div>
          <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-700">
            <p className="text-xs font-semibold text-teal-900 dark:text-teal-100 mb-1">Break Tip</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{prediction.break_suggestion}</p>
          </div>
        </div>

        {/* Feedback */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400">Is this energy prediction accurate?</p>
          {!feedbackGiven ? (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => handleFeedback(true)}>
                <ThumbsUp className="w-4 h-4 text-green-600" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleFeedback(false)}>
                <ThumbsDown className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          ) : (
            <span className="text-xs text-green-600 dark:text-green-400">Thanks! I'm learning from your feedback.</span>
          )}
        </div>

        <Button onClick={predictEnergy} variant="outline" size="sm" className="w-full">
          Re-analyze Energy
        </Button>
      </CardContent>
    </Card>
  );
}