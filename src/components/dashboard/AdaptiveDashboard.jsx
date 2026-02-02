import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Eye, EyeOff } from "lucide-react";

export default function AdaptiveDashboard({ 
  currentUser, 
  tasks, 
  sessions, 
  userProgress,
  visibleWidgets,
  onToggleWidget 
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    analyzeUsage();
  }, [tasks, sessions]);

  const analyzeUsage = async () => {
    if (!currentUser || loading) return;

    try {
      // Check if we should re-analyze (not too frequently)
      const lastAnalysis = localStorage.getItem('last_dashboard_analysis');
      const now = Date.now();
      if (lastAnalysis && now - parseInt(lastAnalysis) < 24 * 60 * 60 * 1000) {
        return; // Don't analyze more than once per day
      }

      setLoading(true);

      // Calculate usage patterns
      const hasGoals = tasks.some(t => t.goal_id);
      const hasTeamTasks = tasks.some(t => t.team_id);
      const focusSessionsCount = sessions.length;
      const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
      const recurringTasksCount = tasks.filter(t => t.is_recurring).length;

      // Generate suggestions
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze user dashboard usage and suggest widget visibility optimizations.

User Activity:
- Total tasks: ${tasks.length}
- Completed tasks: ${completedTasksCount}
- Has goals: ${hasGoals}
- Has team tasks: ${hasTeamTasks}
- Focus sessions: ${focusSessionsCount}
- Recurring tasks: ${recurringTasksCount}
- User level: ${userProgress?.level || 1}

Current visible widgets: ${JSON.stringify(visibleWidgets)}

Suggest up to 3 actionable recommendations to optimize their dashboard:
1. Which widgets to show/hide based on usage
2. New features they should try based on their patterns
3. Workflow improvements

Keep suggestions practical and specific.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  widget_id: { type: "string" },
                  reason: { type: "string" },
                  should_show: { type: "boolean" }
                }
              }
            }
          }
        }
      });

      if (response.suggestions) {
        setSuggestions(response.suggestions);
        localStorage.setItem('last_dashboard_analysis', now.toString());
      }
    } catch (error) {
      console.error("Error analyzing usage:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestion = (suggestion) => {
    if (suggestion.widget_id && onToggleWidget) {
      onToggleWidget(suggestion.widget_id);
    }
    // Remove applied suggestion
    setSuggestions(suggestions.filter(s => s !== suggestion));
  };

  const handleDismissSuggestion = (suggestion) => {
    setSuggestions(suggestions.filter(s => s !== suggestion));
  };

  if (suggestions.length === 0) return null;

  return (
    <Card className="border-teal-200 dark:border-teal-700 bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-500 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Dashboard Optimization
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI suggestions to personalize your workspace
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {suggestions.map((suggestion, idx) => (
            <div 
              key={idx}
              className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-teal-200 dark:border-teal-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {suggestion.should_show ? (
                      <Eye className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    )}
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {suggestion.action}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {suggestion.reason}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={() => handleApplySuggestion(suggestion)}
                    className="bg-teal-500 hover:bg-teal-600 text-white text-xs h-7"
                  >
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismissSuggestion(suggestion)}
                    className="text-xs h-7"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={analyzeUsage}
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-xs"
          disabled={loading}
        >
          {loading ? "Analyzing..." : "Re-analyze Dashboard"}
        </Button>
      </CardContent>
    </Card>
  );
}