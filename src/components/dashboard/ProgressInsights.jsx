import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeUserProgress, getProgressTrend } from "../ai/ProgressAnalyzer";
import { toast } from "sonner";

export default function ProgressInsights({ 
  userProgress, 
  tasks = [], 
  focusSessions = [], 
  brainDumps = [] 
}) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeUserProgress(
        userProgress, 
        tasks, 
        focusSessions, 
        brainDumps
      );
      setAnalysis(result);
      toast.success("Progress analyzed! ✨");
    } catch (error) {
      console.error("Error analyzing progress:", error);
      toast.error("Failed to analyze progress");
    }
    setIsAnalyzing(false);
  };

  const trend = getProgressTrend(tasks);
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-orange-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="space-y-4">
      {!analysis ? (
        <Card className="bg-gradient-to-br from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              AI Progress Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Get personalized insights about your productivity patterns, wins, and areas for growth.
            </p>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Your Progress...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze My Progress
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Summary Card */}
            <Card className="bg-gradient-to-br from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 border-purple-200 dark:border-purple-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    Your Progress Story
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                  >
                    <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                  {analysis.summary}
                </p>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Progress Score
                      </span>
                      <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {analysis.progress_score}/100
                      </span>
                    </div>
                    <Progress value={analysis.progress_score} className="h-2" />
                  </div>
                  <div className="flex items-center gap-1">
                    {getTrendIcon()}
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {trend === 'up' ? 'Improving' : trend === 'down' ? 'Slowing' : 'Steady'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-white/80 dark:bg-gray-800/80 border-purple-100 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {analysis.metrics.completionRate}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Completion Rate</div>
                </CardContent>
              </Card>
              <Card className="bg-white/80 dark:bg-gray-800/80 border-purple-100 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                    {analysis.metrics.streak}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Day Streak</div>
                </CardContent>
              </Card>
              <Card className="bg-white/80 dark:bg-gray-800/80 border-purple-100 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {analysis.metrics.recentSessions}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Focus Sessions</div>
                </CardContent>
              </Card>
              <Card className="bg-white/80 dark:bg-gray-800/80 border-purple-100 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                    {analysis.metrics.avgSessionLength}m
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Avg Session</div>
                </CardContent>
              </Card>
            </div>

            {/* Key Wins */}
            {analysis.key_wins && analysis.key_wins.length > 0 && (
              <Card className="bg-white/80 dark:bg-gray-800/80 border-purple-100 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-base">🎉 Recent Wins</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.key_wins.map((win, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>{win}</span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Insights */}
            {analysis.insights && analysis.insights.length > 0 && (
              <div className="grid md:grid-cols-2 gap-3">
                {analysis.insights.map((insight, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className="bg-white/80 dark:bg-gray-800/80 border-purple-100 dark:border-gray-700 h-full">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <span className="text-xl">{insight.icon}</span>
                          {insight.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {insight.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Recommended Focus */}
            <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-200 dark:border-teal-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  🎯 This Week's Focus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                  {analysis.recommended_focus}
                </p>
              </CardContent>
            </Card>

            {/* Motivation */}
            <Card className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <p className="text-sm text-gray-800 dark:text-gray-200 italic text-center">
                  💜 {analysis.motivation_message}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}