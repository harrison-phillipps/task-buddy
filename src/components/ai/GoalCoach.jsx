import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Target, TrendingUp, AlertTriangle, Trophy, Lightbulb, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function GoalCoach({ goal, tasks = [], userProgress, onApplySuggestion }) {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-trigger removed — user must click "Analyse Goal" button

  const analyzeGoal = async () => {
    if (!goal) return;
    
    setIsLoading(true);
    try {
      const relatedTasks = tasks.filter(t => t.goal_id === goal.id);
      const completedTasks = relatedTasks.filter(t => t.status === 'completed').length;
      const totalTasks = relatedTasks.length;
      const inProgressTasks = relatedTasks.filter(t => t.status === 'in_progress').length;
      
      const daysUntilTarget = goal.target_date 
        ? Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24))
        : null;
      
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      // Calculate progress from key results if OKR
      let keyResultProgress = 0;
      if (goal.key_results?.length > 0) {
        keyResultProgress = goal.key_results.reduce((sum, kr) => {
          const progress = kr.target_value > 0 ? (kr.current_value / kr.target_value) * 100 : 0;
          return sum + progress;
        }, 0) / goal.key_results.length;
      }

      const prompt = `You are an empathetic goal achievement coach analyzing a user's progress.

GOAL DETAILS:
- Title: ${goal.title}
- Type: ${goal.type}
- Status: ${goal.status}
- Priority: ${goal.priority}
- Target Date: ${goal.target_date || "Not set"}
- Days Remaining: ${daysUntilTarget !== null ? daysUntilTarget : "No deadline"}

PROGRESS METRICS:
- Related Tasks: ${totalTasks} (${completedTasks} completed, ${inProgressTasks} in progress)
- Task Completion Rate: ${completionRate.toFixed(1)}%
- Key Results Progress: ${keyResultProgress.toFixed(1)}%

USER CONTEXT:
- User Level: ${Math.floor((userProgress?.total_points || 0) / 200) + 1}
- Current Streak: ${userProgress?.current_streak || 0} days
- Total Tasks Completed: ${userProgress?.tasks_completed || 0}

Provide a comprehensive goal coaching analysis with:

1. **Progress Assessment**: Honest evaluation of current progress
2. **Obstacles**: Identify potential blockers or challenges
3. **Strategic Advice**: 2-3 specific, actionable recommendations
4. **Motivation**: Personalized encouragement based on their level and progress
5. **Next Steps**: Immediate actions they can take today
6. **Timeline Adjustment**: If needed, suggest realistic timeline changes
7. **Celebration**: If progress is good, celebrate specific wins

Be supportive but realistic. Focus on psychological factors (momentum, motivation, sustainability). Keep tone warm and encouraging.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            status_indicator: {
              type: "string",
              enum: ["on_track", "needs_attention", "at_risk", "celebrate"]
            },
            progress_assessment: { type: "string" },
            identified_obstacles: {
              type: "array",
              items: { type: "string" }
            },
            strategic_advice: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  actionable: { type: "boolean" }
                }
              }
            },
            motivation_message: { type: "string" },
            next_immediate_steps: {
              type: "array",
              items: { type: "string" }
            },
            timeline_suggestion: { type: "string" },
            celebration_points: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setAnalysis(result);
    } catch (error) {
      console.error("Error analyzing goal:", error);
    }
    setIsLoading(false);
  };

  const getStatusConfig = () => {
    if (!analysis) return { icon: Target, color: "purple", bgColor: "purple-50", borderColor: "purple-200" };
    
    const configs = {
      on_track: { 
        icon: TrendingUp, 
        color: "green", 
        bgColor: "green-50", 
        borderColor: "green-200",
        label: "On Track"
      },
      needs_attention: { 
        icon: AlertTriangle, 
        color: "orange", 
        bgColor: "orange-50", 
        borderColor: "orange-200",
        label: "Needs Attention"
      },
      at_risk: { 
        icon: AlertTriangle, 
        color: "red", 
        bgColor: "red-50", 
        borderColor: "red-200",
        label: "At Risk"
      },
      celebrate: { 
        icon: Trophy, 
        color: "yellow", 
        bgColor: "yellow-50", 
        borderColor: "yellow-200",
        label: "Crushing It!"
      }
    };
    
    return configs[analysis.status_indicator] || configs.on_track;
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-teal-50 border-purple-200">
        <CardContent className="p-6 text-center">
          <Sparkles className="w-8 h-8 text-purple-600 animate-pulse mx-auto mb-2" />
          <p className="text-sm text-gray-600">Analyzing your goal progress...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-teal-50 border-purple-200">
        <CardContent className="p-6 text-center">
          <Button
            onClick={analyzeGoal}
            className="bg-gradient-to-r from-purple-500 to-teal-500 text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Analyse Goal
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = getStatusConfig();
  const Icon = statusConfig.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Card className={`bg-gradient-to-br from-${statusConfig.bgColor} to-white border-${statusConfig.borderColor} shadow-lg`}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 bg-${statusConfig.color}-500 rounded-xl flex items-center justify-center shadow-md`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">AI Goal Coach</CardTitle>
                  <Badge className={`bg-${statusConfig.color}-500 text-white mt-1`}>
                    {statusConfig.label}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={analyzeGoal}
                className="text-purple-600"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Progress Assessment */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Progress Assessment
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {analysis.progress_assessment}
              </p>
            </div>

            {/* Celebration Points */}
            {analysis.celebration_points?.length > 0 && (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Wins to Celebrate! 🎉
                </h4>
                <ul className="space-y-1">
                  {analysis.celebration_points.map((point, idx) => (
                    <li key={idx} className="text-sm text-yellow-800 flex items-start gap-2">
                      <span className="text-yellow-600 mt-0.5">✨</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Obstacles */}
            {analysis.identified_obstacles?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  Potential Obstacles
                </h4>
                <ul className="space-y-2">
                  {analysis.identified_obstacles.map((obstacle, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">⚠️</span>
                      {obstacle}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Strategic Advice */}
            {analysis.strategic_advice?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-purple-600" />
                  Strategic Recommendations
                </h4>
                <div className="space-y-3">
                  {analysis.strategic_advice.map((advice, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border border-purple-100">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h5 className="font-medium text-gray-900 text-sm">{advice.title}</h5>
                        {advice.actionable && (
                          <Badge variant="outline" className="text-xs">Actionable</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {advice.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Immediate Steps */}
            {analysis.next_immediate_steps?.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-teal-50 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" />
                  Do This Today
                </h4>
                <ul className="space-y-2">
                  {analysis.next_immediate_steps.map((step, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="font-bold text-purple-600">{idx + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timeline Suggestion */}
            {analysis.timeline_suggestion && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">💡 Timeline Tip:</span> {analysis.timeline_suggestion}
                </p>
              </div>
            )}

            {/* Motivation Message */}
            <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
              <p className="text-sm text-gray-800 leading-relaxed italic">
                "{analysis.motivation_message}"
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}