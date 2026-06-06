import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Sparkles, Sun, Moon, Sunrise, Sunset, TrendingUp, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function OptimalTimeRecommender() {
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('analyzeTaskHistory', {
        analysisType: 'optimal_times'
      });

      setRecommendations(response.data);
    } catch (error) {
      console.error("Error loading recommendations:", error);
      toast.error("Failed to load time recommendations");
    }
    setIsLoading(false);
  };

  const getTimeIcon = (timeStr) => {
    const lower = timeStr?.toLowerCase() || '';
    if (lower.includes('morning')) return <Sunrise className="w-4 h-4" />;
    if (lower.includes('afternoon')) return <Sun className="w-4 h-4" />;
    if (lower.includes('evening')) return <Sunset className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const categoryEmojis = {
    work: "💼",
    personal: "🏠",
    creative: "🎨",
    learning: "📚",
    health: "💪"
  };

  if (!recommendations && !isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
        <CardContent className="p-6 text-center">
          <Clock className="w-8 h-8 text-purple-500 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-4">Discover your peak productivity windows based on your session history.</p>
          <button
            onClick={loadRecommendations}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Find my optimal times
          </button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
            <p className="text-sm text-gray-600">Analyzing your productivity patterns...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-teal-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="w-5 h-5 text-purple-600" />
          Your Optimal Work Times
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Time recommendations by category */}
        {recommendations.time_of_day_recommendations && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Best Times by Task Type
            </p>
            {Object.entries(recommendations.time_of_day_recommendations).map(([category, time]) => (
              <div key={category} className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{categoryEmojis[category] || "📋"}</span>
                  <span className="font-medium text-gray-900 capitalize">{category}</span>
                </div>
                <Badge className="bg-purple-100 text-purple-700 border-purple-200 flex items-center gap-1">
                  {getTimeIcon(time)}
                  {time}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Best days */}
        {recommendations.best_days && recommendations.best_days.length > 0 && (
          <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
            <p className="text-xs font-semibold text-teal-900 mb-2">🗓️ Most Productive Days</p>
            <div className="flex gap-2 flex-wrap">
              {recommendations.best_days.map((day, i) => (
                <Badge key={i} className="bg-teal-600 text-white">
                  {day}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Optimal session length */}
        {recommendations.optimal_session_length && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Optimal session length:</span> {recommendations.optimal_session_length} minutes
              </p>
            </div>
          </div>
        )}

        {/* Productivity insights */}
        {recommendations.productivity_insights && (
          <div className="p-4 bg-gradient-to-r from-purple-100 to-teal-100 rounded-lg border border-purple-200">
            <div className="flex items-start gap-2">
              <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-800">{recommendations.productivity_insights}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}