import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertCircle,
  Sparkles,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Calendar
} from "lucide-react";
import { motion } from "framer-motion";

export default function StrategicProgressCoach({ tasks, sessions, userProgress, goals = [] }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('weekly'); // 'weekly' or 'monthly'
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  // No auto-trigger — user must click "Get strategic insight"

  const analyzeProgress = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const daysBack = timeframe === 'weekly' ? 7 : 30;
      const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

      // Filter data for timeframe
      const recentTasks = tasks.filter(t => new Date(t.created_date) >= startDate);
      const completedTasks = recentTasks.filter(t => t.status === 'completed');
      const recentSessions = sessions.filter(s => new Date(s.created_date) >= startDate);

      // Calculate metrics
      const totalFocusTime = recentSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
      const avgSessionLength = recentSessions.length > 0 ? totalFocusTime / recentSessions.length : 0;
      const completionRate = recentTasks.length > 0 ? (completedTasks.length / recentTasks.length) * 100 : 0;

      // Group by days to identify trends
      const dailyData = {};
      for (let i = 0; i < daysBack; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toDateString();
        dailyData[date] = { tasks: 0, focus: 0 };
      }

      completedTasks.forEach(t => {
        const date = new Date(t.updated_date).toDateString();
        if (dailyData[date]) dailyData[date].tasks++;
      });

      recentSessions.forEach(s => {
        const date = new Date(s.created_date).toDateString();
        if (dailyData[date]) dailyData[date].focus += s.duration_minutes || 0;
      });

      // Calculate trend (simple linear regression)
      const dailyValues = Object.values(dailyData).map(d => d.tasks);
      const trend = calculateTrend(dailyValues);

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a strategic progress coach analyzing ${timeframe} trends to provide actionable advice.

Timeframe: Last ${daysBack} days

Key Metrics:
- Total tasks created: ${recentTasks.length}
- Tasks completed: ${completedTasks.length}
- Completion rate: ${completionRate.toFixed(1)}%
- Focus sessions: ${recentSessions.length}
- Total focus time: ${totalFocusTime} minutes
- Avg session length: ${avgSessionLength.toFixed(0)} minutes
- Productivity trend: ${trend > 0 ? 'Improving' : trend < 0 ? 'Declining' : 'Stable'}

User Progress:
- Current level: ${userProgress?.level || 1}
- Current streak: ${userProgress?.current_streak || 0}
- Total points: ${userProgress?.total_points || 0}

Provide strategic analysis including:
1. Overall performance assessment
2. Key trends identified (positive and negative)
3. Specific areas of concern or opportunity
4. Strategic recommendations for improvement
5. Motivational insight based on their journey

Be honest but encouraging. Focus on actionable strategic advice.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_assessment: { type: "string" },
            performance_score: { type: "number" },
            key_trends: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  trend_name: { type: "string" },
                  direction: { type: "string" },
                  description: { type: "string" },
                  impact: { type: "string" }
                }
              }
            },
            areas_of_concern: {
              type: "array",
              items: { type: "string" }
            },
            strategic_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  recommendation: { type: "string" },
                  expected_impact: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            motivational_message: { type: "string" }
          }
        }
      });

      setAnalysis(response);
    } catch (error) {
      console.error("Error analyzing progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTrend = (values) => {
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = values.reduce((sum, _, i) => sum + i * i, 0);
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  };

  const handleFeedback = async (isHelpful) => {
    try {
      await base44.entities.CompanionFeedback.create({
        user_id: userProgress?.user_id,
        message_text: JSON.stringify(analysis),
        context: "strategic_coach",
        rating: isHelpful ? "positive" : "negative"
      });
      setFeedbackGiven(true);
    } catch (error) {
      console.error("Error saving feedback:", error);
    }
  };

  if (loading) {
    return (
      <Card className="border-blue-200 dark:border-blue-700 dark:bg-gray-800">
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-700 dark:text-gray-300 font-medium">
            Analyzing your {timeframe} progress...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="border-blue-200 dark:border-blue-700 dark:bg-gray-800">
        <CardContent className="p-8 text-center">
          <Target className="w-10 h-10 text-blue-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            Get a strategic analysis of your {timeframe} productivity trends.
          </p>
          <Button onClick={analyzeProgress} className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
            <Sparkles className="w-4 h-4 mr-2" />
            Get strategic insight
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 dark:border-blue-700 dark:bg-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Strategic Progress Analysis
          </CardTitle>
          <Tabs value={timeframe} onValueChange={setTimeframe}>
            <TabsList>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Performance Score */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Performance Score</span>
            <Badge className="bg-blue-500 text-white text-lg px-3">
              {Math.round(analysis.performance_score || 75)}/100
            </Badge>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{analysis.overall_assessment}</p>
        </div>

        {/* Key Trends */}
        {analysis.key_trends?.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Key Trends
            </h4>
            <div className="space-y-2">
              {analysis.key_trends.map((trend, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start gap-2">
                    {trend.direction === 'up' ? (
                      <TrendingUp className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : trend.direction === 'down' ? (
                      <TrendingDown className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{trend.trend_name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{trend.description}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        Impact: {trend.impact}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Areas of Concern */}
        {analysis.areas_of_concern?.length > 0 && (
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
            <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Areas to Watch
            </h4>
            <ul className="space-y-1">
              {analysis.areas_of_concern.map((concern, idx) => (
                <li key={idx} className="text-sm text-orange-800 dark:text-orange-200 flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  {concern}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Strategic Recommendations */}
        {analysis.strategic_recommendations?.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Strategic Recommendations
            </h4>
            <div className="space-y-2">
              {analysis.strategic_recommendations.map((rec, idx) => (
                <div key={idx} className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-sm text-purple-900 dark:text-purple-100">{rec.category}</p>
                    <Badge variant={rec.priority === 'high' ? 'default' : 'secondary'} className="text-xs">
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{rec.recommendation}</p>
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    Expected: {rec.expected_impact}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Motivational Message */}
        <div className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 rounded-lg border border-teal-200 dark:border-teal-700">
          <p className="text-sm text-gray-700 dark:text-gray-300 italic">
            💙 {analysis.motivational_message}
          </p>
        </div>

        {/* Feedback */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400">Was this analysis helpful?</p>
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
            <span className="text-xs text-green-600 dark:text-green-400">Thanks for your feedback!</span>
          )}
        </div>

        <Button onClick={analyzeProgress} variant="outline" size="sm" className="w-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Get strategic insight
        </Button>
      </CardContent>
    </Card>
  );
}