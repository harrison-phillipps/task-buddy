import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function SessionHistoryAnalyzer({ sessions, currentUser }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const queryClient = useQueryClient();

  const createTemplateMutation = useMutation({
    mutationFn: (templateData) => base44.entities.FocusSessionTemplate.create(templateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focusTemplates'] });
      toast.success('Template created from suggestion!');
    },
  });

  const analyzeHistory = async () => {
    if (!sessions?.length) return;
    
    setIsAnalyzing(true);
    try {
      // Analyze session patterns
      const completedSessions = sessions.filter(s => s.completed);
      const avgDuration = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / sessions.length;
      
      const pomodoroSessions = sessions.filter(s => s.focus_technique === 'pomodoro');
      const standardSessions = sessions.filter(s => s.focus_technique === 'standard');
      
      const pomodoroCompletionRate = pomodoroSessions.length > 0
        ? (pomodoroSessions.filter(s => s.completed).length / pomodoroSessions.length) * 100
        : 0;
      
      const standardCompletionRate = standardSessions.length > 0
        ? (standardSessions.filter(s => s.completed).length / standardSessions.length) * 100
        : 0;

      const moodImprovements = sessions.filter(s => {
        const energizedMoods = ['energized', 'accomplished', 'focused'];
        const tiredMoods = ['tired', 'frustrated', 'anxious'];
        return tiredMoods.includes(s.mood_before) && energizedMoods.includes(s.mood_after);
      }).length;

      const bestSounds = sessions.reduce((acc, s) => {
        if (s.ambient_sound && s.ambient_sound !== 'none' && s.completed) {
          acc[s.ambient_sound] = (acc[s.ambient_sound] || 0) + 1;
        }
        return acc;
      }, {});

      const topSound = Object.entries(bestSounds).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You're a Focus Session Optimizer - analyze user's session history and suggest optimal templates.

Session History Analysis:
- Total sessions: ${sessions.length}
- Completed: ${completedSessions.length}
- Average duration: ${Math.round(avgDuration)} minutes
- Pomodoro completion rate: ${Math.round(pomodoroCompletionRate)}%
- Standard completion rate: ${Math.round(standardCompletionRate)}%
- Mood improvements: ${moodImprovements} sessions
- Most successful sound: ${topSound}

Best performing work intervals: ${pomodoroSessions.map(s => s.work_interval).join(', ') || 'N/A'}

Based on this data, suggest 2-3 optimal focus session templates:
1. Primary recommendation (best overall performance)
2. Deep work template (for hard tasks)
3. Quick wins template (for easy tasks)

For each template provide:
- Template name
- Description
- Recommended technique (pomodoro/standard)
- Work/break intervals (if pomodoro)
- Ambient sound
- Session goal type and value
- Expected success rate (based on patterns)

Be data-driven and specific!`,
        response_json_schema: {
          type: "object",
          properties: {
            templates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  focus_technique: { type: "string" },
                  work_interval: { type: "number" },
                  break_interval: { type: "number" },
                  ambient_sound: { type: "string" },
                  session_goal_type: { type: "string" },
                  session_goal_value: { type: "number" },
                  expected_success_rate: { type: "number" }
                }
              }
            },
            insights: { type: "string" }
          }
        }
      });

      setSuggestions(result);
    } catch (error) {
      console.error("Session analysis error:", error);
    }
    setIsAnalyzing(false);
  };

  const handleCreateTemplate = (templateData) => {
    const { expected_success_rate, ...data } = templateData;
    createTemplateMutation.mutate({
      ...data,
      enable_focus_bot: true,
      is_ai_suggested: true,
      color: '#8B5CF6'
    });
  };

  if (!sessions?.length || sessions.length < 3) {
    return (
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="py-8 text-center">
          <Sparkles className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
          <p className="text-sm text-indigo-700">
            Complete at least 3 focus sessions to unlock AI-powered template suggestions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-indigo-900">
          <Sparkles className="w-5 h-5" />
          AI Session Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence mode="wait">
          {isAnalyzing && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-6"
            >
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3" />
              <p className="text-sm text-indigo-600">Analyzing {sessions.length} sessions...</p>
            </motion.div>
          )}

          {suggestions && !isAnalyzing && (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="p-3 bg-white rounded-lg border border-indigo-200">
                <p className="text-sm text-indigo-800">{suggestions.insights}</p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-indigo-900">Suggested Templates:</p>
                {suggestions.templates?.map((template, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-3 bg-white rounded-lg border border-indigo-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-indigo-900">{template.name}</p>
                        <p className="text-xs text-indigo-600">{template.description}</p>
                      </div>
                      <Badge className="bg-green-500 text-white">
                        {Math.round(template.expected_success_rate)}% success
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge variant="outline" className="text-xs">
                        {template.focus_technique === 'pomodoro' ? '🍅' : '⏱️'} {template.focus_technique}
                      </Badge>
                      {template.focus_technique === 'pomodoro' && (
                        <Badge variant="outline" className="text-xs">
                          {template.work_interval}m / {template.break_interval}m
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        🎵 {template.ambient_sound}
                      </Badge>
                    </div>
                    <Button
                      onClick={() => handleCreateTemplate(template)}
                      size="sm"
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                    >
                      <CheckCircle className="w-3 h-3 mr-2" />
                      Create Template
                    </Button>
                  </motion.div>
                ))}
              </div>

              <Button
                onClick={analyzeHistory}
                variant="outline"
                size="sm"
                className="w-full border-indigo-300 text-indigo-700"
              >
                <TrendingUp className="w-3 h-3 mr-2" />
                Refresh Analysis
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {!suggestions && !isAnalyzing && (
          <Button
            onClick={analyzeHistory}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Analyze My Sessions
          </Button>
        )}
      </CardContent>
    </Card>
  );
}