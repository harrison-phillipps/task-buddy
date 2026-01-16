import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Brain, Award, Clock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function PersonalizedJourneyAnalyzer({ currentUser, journeyData }) {
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    if (journeyData && journeyData.length >= 3) {
      analyzeJourney();
    }
  }, [journeyData]);

  const analyzeJourney = () => {
    if (!journeyData || journeyData.length === 0) return;

    // Calculate patterns
    const totalSessions = journeyData.length;
    const avgEffectiveness = journeyData.reduce((sum, s) => sum + (s.effectiveness_score || 0), 0) / totalSessions;
    
    // Find most effective technique
    const techniqueStats = journeyData.reduce((acc, s) => {
      if (!acc[s.focus_technique]) {
        acc[s.focus_technique] = { count: 0, avgEffectiveness: 0 };
      }
      acc[s.focus_technique].count++;
      acc[s.focus_technique].avgEffectiveness += s.effectiveness_score || 0;
      return acc;
    }, {});
    
    Object.keys(techniqueStats).forEach(technique => {
      techniqueStats[technique].avgEffectiveness /= techniqueStats[technique].count;
    });
    
    const bestTechnique = Object.entries(techniqueStats).sort((a, b) => 
      b[1].avgEffectiveness - a[1].avgEffectiveness
    )[0];

    // Find best sound
    const soundStats = journeyData.reduce((acc, s) => {
      if (!s.ambient_sound || s.ambient_sound === 'none') return acc;
      if (!acc[s.ambient_sound]) {
        acc[s.ambient_sound] = { count: 0, avgEffectiveness: 0 };
      }
      acc[s.ambient_sound].count++;
      acc[s.ambient_sound].avgEffectiveness += s.effectiveness_score || 0;
      return acc;
    }, {});
    
    Object.keys(soundStats).forEach(sound => {
      soundStats[sound].avgEffectiveness /= soundStats[sound].count;
    });
    
    const bestSound = Object.keys(soundStats).length > 0 
      ? Object.entries(soundStats).sort((a, b) => b[1].avgEffectiveness - a[1].avgEffectiveness)[0]
      : null;

    // Mood to effectiveness correlation
    const moodStats = journeyData.reduce((acc, s) => {
      if (!s.mood_before) return acc;
      if (!acc[s.mood_before]) {
        acc[s.mood_before] = { count: 0, avgEffectiveness: 0 };
      }
      acc[s.mood_before].count++;
      acc[s.mood_before].avgEffectiveness += s.effectiveness_score || 0;
      return acc;
    }, {});
    
    Object.keys(moodStats).forEach(mood => {
      moodStats[mood].avgEffectiveness /= moodStats[mood].count;
    });

    // Best time of day
    const timeStats = journeyData.reduce((acc, s) => {
      if (!s.time_of_day) return acc;
      if (!acc[s.time_of_day]) {
        acc[s.time_of_day] = { count: 0, avgEffectiveness: 0 };
      }
      acc[s.time_of_day].count++;
      acc[s.time_of_day].avgEffectiveness += s.effectiveness_score || 0;
      return acc;
    }, {});
    
    Object.keys(timeStats).forEach(time => {
      timeStats[time].avgEffectiveness /= timeStats[time].count;
    });
    
    const bestTime = Object.entries(timeStats).sort((a, b) => 
      b[1].avgEffectiveness - a[1].avgEffectiveness
    )[0];

    // Mindfulness impact
    const withMindfulness = journeyData.filter(s => s.mindfulness_used);
    const withoutMindfulness = journeyData.filter(s => !s.mindfulness_used);
    
    const mindfulnessImpact = withMindfulness.length > 0 && withoutMindfulness.length > 0 ? {
      withAvg: withMindfulness.reduce((sum, s) => sum + (s.effectiveness_score || 0), 0) / withMindfulness.length,
      withoutAvg: withoutMindfulness.reduce((sum, s) => sum + (s.effectiveness_score || 0), 0) / withoutMindfulness.length
    } : null;

    setInsights({
      totalSessions,
      avgEffectiveness: Math.round(avgEffectiveness),
      bestTechnique: bestTechnique ? {
        name: bestTechnique[0],
        effectiveness: Math.round(bestTechnique[1].avgEffectiveness)
      } : null,
      bestSound: bestSound ? {
        name: bestSound[0],
        effectiveness: Math.round(bestSound[1].avgEffectiveness)
      } : null,
      bestTime: bestTime ? {
        name: bestTime[0],
        effectiveness: Math.round(bestTime[1].avgEffectiveness)
      } : null,
      moodStats,
      mindfulnessImpact
    });
  };

  if (!insights) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <Card className="bg-gradient-to-br from-purple-50 to-teal-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Brain className="w-5 h-5" />
            Your Focus Journey Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-lg text-center">
              <Award className="w-4 h-4 mx-auto mb-1 text-purple-600" />
              <p className="text-xs text-gray-600">Total Sessions</p>
              <p className="text-xl font-bold text-purple-900">{insights.totalSessions}</p>
            </div>
            <div className="p-3 bg-white rounded-lg text-center">
              <TrendingUp className="w-4 h-4 mx-auto mb-1 text-teal-600" />
              <p className="text-xs text-gray-600">Avg Effectiveness</p>
              <p className="text-xl font-bold text-teal-900">{insights.avgEffectiveness}%</p>
            </div>
          </div>

          {insights.bestTechnique && (
            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs font-semibold text-gray-900 mb-1">Your Best Technique</p>
              <div className="flex items-center justify-between">
                <Badge className="capitalize">{insights.bestTechnique.name}</Badge>
                <span className="text-sm font-bold text-purple-600">{insights.bestTechnique.effectiveness}% effective</span>
              </div>
            </div>
          )}

          {insights.bestSound && (
            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs font-semibold text-gray-900 mb-1">Your Best Sound</p>
              <div className="flex items-center justify-between">
                <Badge className="capitalize">{insights.bestSound.name.replace('_', ' ')}</Badge>
                <span className="text-sm font-bold text-teal-600">{insights.bestSound.effectiveness}% effective</span>
              </div>
            </div>
          )}

          {insights.bestTime && (
            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs font-semibold text-gray-900 mb-1">Your Peak Performance Time</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <Badge className="capitalize">{insights.bestTime.name}</Badge>
                </div>
                <span className="text-sm font-bold text-blue-600">{insights.bestTime.effectiveness}% effective</span>
              </div>
            </div>
          )}

          {insights.mindfulnessImpact && insights.mindfulnessImpact.withAvg > insights.mindfulnessImpact.withoutAvg && (
            <div className="p-3 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg border border-teal-200">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <p className="text-xs font-semibold text-teal-900">Mindfulness Boost</p>
              </div>
              <p className="text-sm text-teal-700">
                Sessions with mindfulness are {Math.round(insights.mindfulnessImpact.withAvg - insights.mindfulnessImpact.withoutAvg)}% more effective!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}