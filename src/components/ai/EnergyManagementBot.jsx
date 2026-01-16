import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Sun, Moon, Sunrise, Sunset, Loader2, Battery } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function EnergyManagementBot({ tasks, sessions, userProgress }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [energyPlan, setEnergyPlan] = useState(null);
  const [showBot, setShowBot] = useState(true);

  const analyzeEnergyPatterns = async () => {
    setIsAnalyzing(true);
    try {
      // Analyze session times and moods
      const sessionsByHour = sessions.reduce((acc, session) => {
        if (!session.created_date) return acc;
        const hour = new Date(session.created_date).getHours();
        if (!acc[hour]) acc[hour] = [];
        acc[hour].push(session);
        return acc;
      }, {});

      const moodData = sessions.filter(s => s.mood_before && s.mood_after).map(s => ({
        timeslot: getTimeSlot(new Date(s.created_date).getHours()),
        moodBefore: s.mood_before,
        moodAfter: s.mood_after,
        duration: s.duration_minutes
      }));

      const currentHour = new Date().getHours();
      const currentTimeSlot = getTimeSlot(currentHour);

      // Get pending tasks by energy level
      const pendingTasks = tasks.filter(t => t.status !== 'completed');
      const tasksByEnergy = {
        high: pendingTasks.filter(t => t.energy_level_needed === 'high').length,
        medium: pendingTasks.filter(t => t.energy_level_needed === 'medium').length,
        low: pendingTasks.filter(t => t.energy_level_needed === 'low').length
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You're an Energy Management Bot - an AI that optimizes task scheduling based on predicted energy levels.

Session Analysis:
- Total sessions: ${sessions.length}
- Current time: ${currentHour}:00 (${currentTimeSlot})
- Session mood patterns: ${JSON.stringify(moodData.slice(0, 5))}

Pending tasks by energy requirement:
- High energy: ${tasksByEnergy.high} tasks
- Medium energy: ${tasksByEnergy.medium} tasks
- Low energy: ${tasksByEnergy.low} tasks

Based on historical patterns and current time, provide:
1. Current predicted energy level (low/medium/high)
2. Best time slot for high-energy tasks (morning/afternoon/evening)
3. Optimal task for right now (based on current energy)
4. Energy optimization tip (one actionable suggestion)
5. Next energy peak prediction (morning/afternoon/evening/none today)

Be specific and time-aware!`,
        response_json_schema: {
          type: "object",
          properties: {
            current_energy_level: { type: "string" },
            best_high_energy_slot: { type: "string" },
            optimal_task_now: { type: "string" },
            optimization_tip: { type: "string" },
            next_energy_peak: { type: "string" },
            energy_forecast: { type: "string" }
          }
        }
      });

      setEnergyPlan({
        ...result,
        currentTimeSlot,
        tasksByEnergy
      });
    } catch (error) {
      console.error("Energy bot error:", error);
    }
    setIsAnalyzing(false);
  };

  const getTimeSlot = (hour) => {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  };

  useEffect(() => {
    if (tasks?.length > 0 && sessions?.length > 2 && !energyPlan) {
      analyzeEnergyPatterns();
    }
  }, []);

  if (!showBot || !tasks?.length || sessions?.length < 2) return null;

  const getEnergyColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'from-yellow-500 to-orange-500';
      case 'medium': return 'from-blue-500 to-cyan-500';
      case 'low': return 'from-purple-500 to-indigo-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getTimeSlotIcon = (slot) => {
    switch (slot) {
      case 'morning': return <Sunrise className="w-5 h-5" />;
      case 'afternoon': return <Sun className="w-5 h-5" />;
      case 'evening': return <Sunset className="w-5 h-5" />;
      case 'night': return <Moon className="w-5 h-5" />;
      default: return <Zap className="w-5 h-5" />;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-yellow-900">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
              <Battery className="w-4 h-4 text-white" />
            </div>
            Energy Manager
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBot(false)}
            className="text-yellow-600"
          >
            ✕
          </Button>
        </div>
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
              <Loader2 className="w-8 h-8 animate-spin text-yellow-500 mx-auto mb-3" />
              <p className="text-sm text-yellow-600">Analyzing energy patterns...</p>
            </motion.div>
          )}

          {energyPlan && !isAnalyzing && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className={`p-4 bg-gradient-to-r ${getEnergyColor(energyPlan.current_energy_level)} rounded-xl text-white`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Current Energy</span>
                  {getTimeSlotIcon(energyPlan.currentTimeSlot)}
                </div>
                <p className="text-2xl font-bold capitalize">{energyPlan.current_energy_level}</p>
                <p className="text-sm mt-1 opacity-90 capitalize">
                  {energyPlan.currentTimeSlot} • {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-white rounded-lg border border-yellow-200 text-center">
                  <p className="text-xs text-yellow-600 mb-1">⚡ High</p>
                  <p className="text-lg font-bold text-yellow-900">{energyPlan.tasksByEnergy.high}</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-yellow-200 text-center">
                  <p className="text-xs text-yellow-600 mb-1">💪 Medium</p>
                  <p className="text-lg font-bold text-yellow-900">{energyPlan.tasksByEnergy.medium}</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-yellow-200 text-center">
                  <p className="text-xs text-yellow-600 mb-1">🌙 Low</p>
                  <p className="text-lg font-bold text-yellow-900">{energyPlan.tasksByEnergy.low}</p>
                </div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-yellow-200">
                <p className="text-xs font-semibold text-yellow-900 mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Optimal Task Right Now:
                </p>
                <p className="text-sm text-yellow-800">{energyPlan.optimal_task_now}</p>
              </div>

              <div className="p-3 bg-yellow-100 rounded-lg">
                <p className="text-xs font-semibold text-yellow-900 mb-1">💡 Energy Tip:</p>
                <p className="text-sm text-yellow-800">{energyPlan.optimization_tip}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-lg border border-yellow-200">
                  <p className="text-xs text-yellow-600 mb-1">Best for High Energy</p>
                  <Badge className="bg-yellow-500 text-white capitalize">
                    {energyPlan.best_high_energy_slot}
                  </Badge>
                </div>
                <div className="p-3 bg-white rounded-lg border border-yellow-200">
                  <p className="text-xs text-yellow-600 mb-1">Next Energy Peak</p>
                  <Badge className="bg-orange-500 text-white capitalize">
                    {energyPlan.next_energy_peak}
                  </Badge>
                </div>
              </div>

              {energyPlan.energy_forecast && (
                <div className="p-3 bg-white rounded-lg border border-yellow-200">
                  <p className="text-xs text-yellow-700">{energyPlan.energy_forecast}</p>
                </div>
              )}

              <Button
                onClick={analyzeEnergyPatterns}
                variant="outline"
                size="sm"
                className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50"
              >
                <Battery className="w-3 h-3 mr-2" />
                Refresh Energy Analysis
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {!energyPlan && !isAnalyzing && (
          <Button
            onClick={analyzeEnergyPatterns}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
          >
            <Battery className="w-4 h-4 mr-2" />
            Analyze Energy Patterns
          </Button>
        )}
      </CardContent>
    </Card>
  );
}