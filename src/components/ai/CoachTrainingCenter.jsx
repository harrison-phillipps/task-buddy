import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  TrendingUp, 
  MessageSquare,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  BarChart
} from "lucide-react";
import { motion } from "framer-motion";

export default function CoachTrainingCenter({ currentUser }) {
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const feedbackList = await base44.entities.CompanionFeedback.filter(
        { user_id: currentUser.id },
        '-created_date',
        50
      );
      setFeedback(feedbackList);
      calculateStats(feedbackList);
    } catch (error) {
      console.error("Error loading feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (feedbackList) => {
    const total = feedbackList.length;
    const positive = feedbackList.filter(f => f.rating === 'positive').length;
    const negative = feedbackList.filter(f => f.rating === 'negative').length;
    
    const byContext = {};
    feedbackList.forEach(f => {
      if (!byContext[f.context]) byContext[f.context] = { positive: 0, negative: 0 };
      byContext[f.context][f.rating]++;
    });

    setStats({
      total,
      positive,
      negative,
      positiveRate: total > 0 ? (positive / total * 100).toFixed(0) : 0,
      byContext
    });
  };

  const groupedFeedback = feedback.reduce((acc, f) => {
    if (!acc[f.context]) acc[f.context] = [];
    acc[f.context].push(f);
    return acc;
  }, {});

  const contextLabels = {
    'strategic_coach': 'Strategic Progress Coach',
    'energy_coach': 'Energy Management Coach',
    'dashboard': 'Dashboard Messages',
    'task_complete': 'Task Completion',
    'focus_session': 'Focus Sessions'
  };

  if (loading) {
    return (
      <Card className="border-purple-200 dark:border-purple-700 dark:bg-gray-800">
        <CardContent className="p-8 text-center">
          <Brain className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-pulse mx-auto mb-3" />
          <p className="text-gray-700 dark:text-gray-300">Loading training data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 dark:border-purple-700 dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          AI Coach Training Center
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          Help your AI coach learn your preferences by providing feedback
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Overview */}
        {stats && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="font-semibold text-gray-900 dark:text-gray-100">Training Progress</span>
              </div>
              <Badge className="bg-purple-500 text-white">
                {stats.positiveRate}% helpful
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Feedback</p>
              </div>
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.positive}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Helpful</p>
              </div>
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.negative}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Not Helpful</p>
              </div>
            </div>
          </div>
        )}

        {/* Feedback by Context */}
        <Tabs defaultValue={Object.keys(groupedFeedback)[0] || 'all'}>
          <TabsList className="w-full">
            <TabsTrigger value="all">All Feedback</TabsTrigger>
            {Object.keys(groupedFeedback).slice(0, 3).map(context => (
              <TabsTrigger key={context} value={context}>
                {contextLabels[context] || context}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="space-y-2 mt-4">
            {feedback.slice(0, 10).map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {contextLabels[item.context] || item.context}
                  </Badge>
                  {item.rating === 'positive' ? (
                    <ThumbsUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <ThumbsDown className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {new Date(item.created_date).toLocaleDateString()}
                </p>
              </motion.div>
            ))}
          </TabsContent>

          {Object.entries(groupedFeedback).map(([context, items]) => (
            <TabsContent key={context} value={context} className="space-y-2 mt-4">
              {stats?.byContext[context] && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 mb-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>{items.length}</strong> feedback items •{' '}
                    <span className="text-green-600 dark:text-green-400">
                      {stats.byContext[context].positive} helpful
                    </span>
                    {' '}•{' '}
                    <span className="text-red-600 dark:text-red-400">
                      {stats.byContext[context].negative} not helpful
                    </span>
                  </p>
                </div>
              )}
              {items.slice(0, 10).map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center justify-between mb-1">
                    {item.rating === 'positive' ? (
                      <ThumbsUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <ThumbsDown className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {new Date(item.created_date).toLocaleDateString()}
                    </span>
                  </div>
                  {item.feedback && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{item.feedback}</p>
                  )}
                </motion.div>
              ))}
            </TabsContent>
          ))}
        </Tabs>

        {/* Learning Status */}
        <div className="p-3 bg-gradient-to-r from-teal-50 to-green-50 dark:from-teal-900/20 dark:to-green-900/20 rounded-lg border border-teal-200 dark:border-teal-700">
          <div className="flex items-start gap-2">
            <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Your Coach is Learning
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Every piece of feedback helps personalize suggestions to match your work style and preferences. 
                Keep rating messages to improve accuracy!
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}