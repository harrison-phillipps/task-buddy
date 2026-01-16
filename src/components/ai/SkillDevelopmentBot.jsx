import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Award, TrendingUp, ExternalLink, Loader2, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SkillDevelopmentBot({ tasks, sessions, userProgress }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [showBot, setShowBot] = useState(true);

  const analyzeSkillGaps = async () => {
    setIsAnalyzing(true);
    try {
      // Analyze task completion patterns
      const completedTasks = tasks.filter(t => t.status === 'completed');
      const failedOrStuckTasks = tasks.filter(t => 
        t.status === 'blocked' || 
        (t.subtasks?.some(st => !st.completed) && t.updated_date && 
          (Date.now() - new Date(t.updated_date).getTime()) > 7 * 24 * 60 * 60 * 1000)
      );

      const tasksByDifficulty = {
        easy: tasks.filter(t => t.difficulty === 'easy'),
        medium: tasks.filter(t => t.difficulty === 'medium'),
        hard: tasks.filter(t => t.difficulty === 'hard')
      };

      const completionRateByDifficulty = {
        easy: tasksByDifficulty.easy.length > 0 
          ? (tasksByDifficulty.easy.filter(t => t.status === 'completed').length / tasksByDifficulty.easy.length) * 100 
          : 100,
        medium: tasksByDifficulty.medium.length > 0 
          ? (tasksByDifficulty.medium.filter(t => t.status === 'completed').length / tasksByDifficulty.medium.length) * 100 
          : 100,
        hard: tasksByDifficulty.hard.length > 0 
          ? (tasksByDifficulty.hard.filter(t => t.status === 'completed').length / tasksByDifficulty.hard.length) * 100 
          : 100
      };

      const categoryDistribution = tasks.reduce((acc, task) => {
        acc[task.category] = (acc[task.category] || 0) + 1;
        return acc;
      }, {});

      const topCategories = Object.entries(categoryDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You're a Skill Development Bot - an AI coach that identifies skill gaps and suggests learning resources.

User Performance Analysis:
- Total tasks: ${tasks.length}
- Completed: ${completedTasks.length}
- Focus sessions: ${sessions.length}
- Level: ${userProgress?.level || 1}

Completion rates by difficulty:
- Easy tasks: ${Math.round(completionRateByDifficulty.easy)}%
- Medium tasks: ${Math.round(completionRateByDifficulty.medium)}%
- Hard tasks: ${Math.round(completionRateByDifficulty.hard)}%

Top task categories: ${topCategories.join(', ')}
Tasks stuck/blocked: ${failedOrStuckTasks.length}

Based on this data, provide:
1. Primary skill gap (what area needs improvement)
2. Skill level assessment (beginner/intermediate/advanced)
3. Two specific learning resources (courses, books, or techniques - be realistic and specific)
4. One quick win practice tip (something they can do today)
5. Growth potential (how much improvement is possible in this area)

Focus on practical, actionable learning paths!`,
        response_json_schema: {
          type: "object",
          properties: {
            primary_skill_gap: { type: "string" },
            skill_level: { type: "string" },
            learning_resources: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  type: { type: "string" },
                  description: { type: "string" }
                }
              }
            },
            quick_win_tip: { type: "string" },
            growth_potential: { type: "string" }
          }
        }
      });

      setRecommendations({
        ...result,
        stats: {
          completionRates: completionRateByDifficulty,
          stuckTasks: failedOrStuckTasks.length
        }
      });
    } catch (error) {
      console.error("Skill bot error:", error);
    }
    setIsAnalyzing(false);
  };

  useEffect(() => {
    if (tasks?.length > 3 && !recommendations) {
      analyzeSkillGaps();
    }
  }, []);

  if (!showBot || !tasks?.length) return null;

  const getSkillColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'advanced': return 'bg-purple-500 text-white';
      case 'intermediate': return 'bg-blue-500 text-white';
      case 'beginner': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getResourceIcon = (type) => {
    if (type?.toLowerCase().includes('course')) return '🎓';
    if (type?.toLowerCase().includes('book')) return '📚';
    if (type?.toLowerCase().includes('video')) return '🎥';
    if (type?.toLowerCase().includes('article')) return '📝';
    return '💡';
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            Skill Development Coach
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBot(false)}
            className="text-purple-600"
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
              <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
              <p className="text-sm text-purple-600">Analyzing your skills...</p>
            </motion.div>
          )}

          {recommendations && !isAnalyzing && (
            <motion.div
              key="recommendations"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="p-3 bg-white rounded-lg border border-purple-200">
                <p className="text-xs font-semibold text-purple-900 mb-1 flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  Primary Focus Area:
                </p>
                <p className="text-sm text-purple-800 mb-2">{recommendations.primary_skill_gap}</p>
                <Badge className={getSkillColor(recommendations.skill_level)}>
                  Current Level: {recommendations.skill_level}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-white rounded-lg border border-purple-200 text-center">
                  <p className="text-xs text-purple-600 mb-1">Easy</p>
                  <p className="text-lg font-bold text-purple-900">
                    {Math.round(recommendations.stats.completionRates.easy)}%
                  </p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-purple-200 text-center">
                  <p className="text-xs text-purple-600 mb-1">Medium</p>
                  <p className="text-lg font-bold text-purple-900">
                    {Math.round(recommendations.stats.completionRates.medium)}%
                  </p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-purple-200 text-center">
                  <p className="text-xs text-purple-600 mb-1">Hard</p>
                  <p className="text-lg font-bold text-purple-900">
                    {Math.round(recommendations.stats.completionRates.hard)}%
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-purple-900 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Recommended Resources:
                </p>
                {recommendations.learning_resources?.map((resource, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-lg border border-purple-200">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{getResourceIcon(resource.type)}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-purple-900">{resource.title}</p>
                        <p className="text-xs text-purple-600 mb-1">{resource.type}</p>
                        <p className="text-xs text-purple-700">{resource.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-purple-100 rounded-lg">
                <p className="text-xs font-semibold text-purple-900 mb-1 flex items-center gap-1">
                  ⚡ Quick Win Today:
                </p>
                <p className="text-sm text-purple-800">{recommendations.quick_win_tip}</p>
              </div>

              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg">
                <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Growth Potential:
                </p>
                <p className="text-sm">{recommendations.growth_potential}</p>
              </div>

              <Button
                onClick={analyzeSkillGaps}
                variant="outline"
                size="sm"
                className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <BookOpen className="w-3 h-3 mr-2" />
                Refresh Analysis
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {!recommendations && !isAnalyzing && (
          <Button
            onClick={analyzeSkillGaps}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            Analyze My Skills
          </Button>
        )}
      </CardContent>
    </Card>
  );
}