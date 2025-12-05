import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Clock, Zap, Target, ChevronRight, Battery, BatteryLow, BatteryMedium, BatteryFull, Loader2, RefreshCw, TrendingUp, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const energyIcons = {
  low: BatteryLow,
  medium: BatteryMedium,
  high: BatteryFull
};

const energyColors = {
  low: "text-green-500",
  medium: "text-yellow-500",
  high: "text-red-500"
};

// Scoring weights for task prioritization
const SCORING_WEIGHTS = {
  ENERGY_MATCH: 25,
  IN_PROGRESS: 20,
  DEADLINE_URGENT: 30,
  DEADLINE_SOON: 15,
  QUICK_WIN: 15,
  CATEGORY_VARIETY: 5,
  HISTORICAL_SUCCESS: 10,
  BLOCKED_PENALTY: -50
};

// Calculate days until deadline
const getDaysUntilDeadline = (dueDate) => {
  if (!dueDate) return null;
  const now = new Date();
  const deadline = new Date(dueDate);
  const diffTime = deadline - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Calculate local score for a task
const calculateTaskScore = (task, currentEnergy, completionHistory, recentCategories) => {
  let score = 50; // Base score
  const factors = [];

  // 1. Energy match scoring
  const taskEnergy = task.energy_level_needed || "medium";
  if (currentEnergy === taskEnergy) {
    score += SCORING_WEIGHTS.ENERGY_MATCH;
    factors.push({ type: "energy", label: "Perfect energy match", icon: "⚡", positive: true });
  } else if (
    (currentEnergy === "low" && taskEnergy === "medium") ||
    (currentEnergy === "medium" && taskEnergy === "low") ||
    (currentEnergy === "high" && taskEnergy === "medium")
  ) {
    score += SCORING_WEIGHTS.ENERGY_MATCH * 0.5;
    factors.push({ type: "energy", label: "Good energy fit", icon: "⚡", positive: true });
  } else if (currentEnergy === "low" && taskEnergy === "high") {
    score -= 15;
    factors.push({ type: "energy", label: "May be too demanding", icon: "⚠️", positive: false });
  }

  // 2. In-progress bonus
  if (task.status === "in_progress") {
    score += SCORING_WEIGHTS.IN_PROGRESS;
    factors.push({ type: "progress", label: "Already started", icon: "▶️", positive: true });
  }

  // 3. Deadline scoring
  const daysUntil = getDaysUntilDeadline(task.due_date);
  if (daysUntil !== null) {
    if (daysUntil < 0) {
      score += SCORING_WEIGHTS.DEADLINE_URGENT + 10;
      factors.push({ type: "deadline", label: "Overdue!", icon: "🚨", positive: false, urgent: true });
    } else if (daysUntil === 0) {
      score += SCORING_WEIGHTS.DEADLINE_URGENT;
      factors.push({ type: "deadline", label: "Due today!", icon: "📅", positive: false, urgent: true });
    } else if (daysUntil <= 2) {
      score += SCORING_WEIGHTS.DEADLINE_SOON;
      factors.push({ type: "deadline", label: `Due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`, icon: "📅", positive: true });
    }
  }

  // 4. Quick win scoring (for low energy or momentum building)
  const estimatedTime = task.estimated_minutes || task.subtasks?.reduce((sum, st) => sum + (st.estimated_minutes || 10), 0) || 30;
  if (estimatedTime <= 15 && (currentEnergy === "low" || task.difficulty === "easy")) {
    score += SCORING_WEIGHTS.QUICK_WIN;
    factors.push({ type: "quickwin", label: "Quick win opportunity", icon: "🎯", positive: true });
  }

  // 5. Category variety (avoid burnout from same type)
  if (recentCategories.length > 0 && !recentCategories.includes(task.category)) {
    score += SCORING_WEIGHTS.CATEGORY_VARIETY;
    factors.push({ type: "variety", label: "Fresh category", icon: "🔄", positive: true });
  }

  // 6. Historical success rate for this category/difficulty
  const categorySuccess = completionHistory[task.category];
  if (categorySuccess && categorySuccess.completionRate > 0.7) {
    score += SCORING_WEIGHTS.HISTORICAL_SUCCESS;
    factors.push({ type: "history", label: "You're great at these!", icon: "📈", positive: true });
  }

  // 7. Blocked task penalty
  if (task.blocked_by && task.blocked_by.length > 0) {
    score += SCORING_WEIGHTS.BLOCKED_PENALTY;
    factors.push({ type: "blocked", label: "Blocked by other tasks", icon: "🚫", positive: false });
  }

  // 8. Subtask progress bonus
  if (task.subtasks && task.subtasks.length > 0) {
    const completedSubtasks = task.subtasks.filter(st => st.completed).length;
    const progressPercent = completedSubtasks / task.subtasks.length;
    if (progressPercent > 0 && progressPercent < 1) {
      score += 10 * progressPercent;
      factors.push({ type: "progress", label: `${Math.round(progressPercent * 100)}% complete`, icon: "📊", positive: true });
    }
  }

  return { score: Math.max(0, Math.min(100, score)), factors };
};

export default function SmartTaskSuggestion({ tasks = [], userProgress, focusSessions = [] }) {
  const navigate = useNavigate();
  const [currentEnergy, setCurrentEnergy] = useState("medium");
  const [suggestedTask, setSuggestedTask] = useState(null);
  const [reasoning, setReasoning] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [allSuggestions, setAllSuggestions] = useState([]);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const incompleteTasks = tasks.filter(t => t.status !== 'completed');

  // Build completion history from user progress and sessions
  const buildCompletionHistory = () => {
    const history = {};
    const completedTasks = tasks.filter(t => t.status === 'completed');
    
    completedTasks.forEach(task => {
      const cat = task.category || 'personal';
      if (!history[cat]) {
        history[cat] = { total: 0, completed: 0, completionRate: 0 };
      }
      history[cat].completed++;
      history[cat].total++;
    });

    incompleteTasks.forEach(task => {
      const cat = task.category || 'personal';
      if (!history[cat]) {
        history[cat] = { total: 0, completed: 0, completionRate: 0 };
      }
      history[cat].total++;
    });

    Object.keys(history).forEach(cat => {
      history[cat].completionRate = history[cat].total > 0 
        ? history[cat].completed / history[cat].total 
        : 0;
    });

    return history;
  };

  // Get recently worked on categories
  const getRecentCategories = () => {
    const recent = tasks
      .filter(t => t.status === 'completed' && t.updated_date)
      .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
      .slice(0, 3)
      .map(t => t.category);
    return [...new Set(recent)];
  };

  const analyzeAndSuggest = async () => {
    if (incompleteTasks.length === 0) {
      setSuggestedTask(null);
      setReasoning("No tasks available. Create some tasks to get personalized suggestions!");
      return;
    }

    setIsAnalyzing(true);

    const completionHistory = buildCompletionHistory();
    const recentCategories = getRecentCategories();

    // Calculate scores for all tasks
    const scoredTasks = incompleteTasks.map(task => {
      const { score, factors } = calculateTaskScore(task, currentEnergy, completionHistory, recentCategories);
      return { task, score, factors };
    });

    // Sort by score descending
    scoredTasks.sort((a, b) => b.score - a.score);

    try {
      // Use AI to enhance reasoning and validate suggestions
      const topCandidates = scoredTasks.slice(0, 5);
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a supportive ADHD productivity coach. Based on the scoring analysis below, provide friendly, encouraging explanations for why each task is recommended.

User's current state:
- Energy level: ${currentEnergy}
- Current streak: ${userProgress?.current_streak || 0} days
- Time: ${new Date().toLocaleTimeString()}

Top task candidates (pre-scored):
${topCandidates.map((t, i) => `
${i + 1}. "${t.task.title}" (Score: ${t.score.toFixed(0)}/100)
   - Category: ${t.task.category || 'personal'}
   - Difficulty: ${t.task.difficulty || 'medium'}
   - Energy needed: ${t.task.energy_level_needed || 'medium'}
   - Time estimate: ${t.task.estimated_minutes || 30} min
   - Status: ${t.task.status}
   - Scoring factors: ${t.factors.map(f => f.label).join(', ')}
`).join('')}

For each task, write a short, encouraging "why this task" explanation (1-2 sentences max). Focus on the positive factors and be motivating. If a task has blockers or issues, acknowledge them gently.`,
        response_json_schema: {
          type: "object",
          properties: {
            explanations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task_title: { type: "string" },
                  why_this_task: { type: "string" },
                  confidence: { type: "string" }
                }
              }
            },
            motivation_tip: { type: "string" }
          }
        }
      });

      // Merge AI explanations with scored tasks
      const enhancedSuggestions = topCandidates.map(scored => {
        const aiExplanation = result.explanations?.find(
          e => e.task_title?.toLowerCase() === scored.task.title?.toLowerCase()
        );
        return {
          ...scored,
          reasoning: aiExplanation?.why_this_task || generateFallbackReasoning(scored.factors),
          confidence: aiExplanation?.confidence || "good"
        };
      });

      setAllSuggestions(enhancedSuggestions);
      
      if (enhancedSuggestions.length > 0) {
        setSuggestedTask(enhancedSuggestions[0].task);
        setReasoning(enhancedSuggestions[0].reasoning);
      }
    } catch (error) {
      console.error("Error with AI analysis:", error);
      // Use local scoring with fallback reasoning
      const suggestions = scoredTasks.slice(0, 5).map(scored => ({
        ...scored,
        reasoning: generateFallbackReasoning(scored.factors)
      }));
      
      setAllSuggestions(suggestions);
      if (suggestions.length > 0) {
        setSuggestedTask(suggestions[0].task);
        setReasoning(suggestions[0].reasoning);
      }
    }

    setIsAnalyzing(false);
  };

  const generateFallbackReasoning = (factors) => {
    const positiveFactors = factors.filter(f => f.positive);
    if (positiveFactors.length === 0) {
      return "This task is ready to be tackled!";
    }
    const topFactor = positiveFactors[0];
    const reasonings = {
      energy: "This matches your current energy perfectly!",
      progress: "You've already started - keep the momentum going!",
      deadline: "This one needs your attention soon!",
      quickwin: "A quick win to build momentum!",
      variety: "Something different to keep things fresh!",
      history: "You're great at tasks like this!"
    };
    return reasonings[topFactor.type] || "Great choice to work on next!";
  };

  useEffect(() => {
    if (incompleteTasks.length > 0) {
      analyzeAndSuggest();
    }
  }, [currentEnergy, tasks.length]);

  const startTask = (task) => {
    navigate(createPageUrl("FocusSession") + `?taskId=${task.id}`);
  };

  const EnergyIcon = energyIcons[currentEnergy];

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-teal-50 border-purple-200 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-teal-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            Smart Task Suggestion
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={analyzeAndSuggest}
            disabled={isAnalyzing}
            className="text-purple-600 hover:bg-purple-100"
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Energy Level Selector */}
        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-purple-100">
          <Battery className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-gray-700">How's your energy?</span>
          <Select value={currentEnergy} onValueChange={setCurrentEnergy}>
            <SelectTrigger className="w-32 ml-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">
                <span className="flex items-center gap-2">
                  <BatteryLow className="w-4 h-4 text-green-500" /> Low
                </span>
              </SelectItem>
              <SelectItem value="medium">
                <span className="flex items-center gap-2">
                  <BatteryMedium className="w-4 h-4 text-yellow-500" /> Medium
                </span>
              </SelectItem>
              <SelectItem value="high">
                <span className="flex items-center gap-2">
                  <BatteryFull className="w-4 h-4 text-red-500" /> High
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Suggested Task */}
        <AnimatePresence mode="wait">
          {isAnalyzing ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8"
            >
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-3" />
              <p className="text-sm text-gray-600">Analyzing your tasks...</p>
            </motion.div>
          ) : suggestedTask ? (
            <motion.div
              key="suggestion"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {/* Main Suggestion */}
              <div className="p-4 bg-white rounded-xl border-2 border-purple-200 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-semibold text-purple-600 uppercase">Best Match</span>
                      {allSuggestions[0]?.score && (
                        <Badge className="bg-gradient-to-r from-purple-500 to-teal-500 text-white text-xs">
                          {Math.round(allSuggestions[0].score)}% match
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">{suggestedTask.title}</h3>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline" className="text-xs">
                    {suggestedTask.category}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${energyColors[suggestedTask.energy_level_needed || 'medium']}`}>
                    <Zap className="w-3 h-3 mr-1" />
                    {suggestedTask.energy_level_needed || 'medium'} energy
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {suggestedTask.estimated_minutes || suggestedTask.subtasks?.reduce((sum, st) => sum + (st.estimated_minutes || 10), 0) || 30}m
                  </Badge>
                  {suggestedTask.due_date && (
                    <Badge variant="outline" className={`text-xs ${getDaysUntilDeadline(suggestedTask.due_date) <= 1 ? 'bg-red-50 text-red-700 border-red-200' : ''}`}>
                      <Calendar className="w-3 h-3 mr-1" />
                      {getDaysUntilDeadline(suggestedTask.due_date) < 0 
                        ? 'Overdue' 
                        : getDaysUntilDeadline(suggestedTask.due_date) === 0 
                          ? 'Due today' 
                          : `${getDaysUntilDeadline(suggestedTask.due_date)}d left`}
                    </Badge>
                  )}
                </div>

                {/* Why This Task Section */}
                <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-teal-50 rounded-lg border border-purple-100">
                  <div className="flex items-start gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-600 mt-0.5" />
                    <span className="text-xs font-semibold text-purple-700 uppercase">Why this task?</span>
                  </div>
                  <p className="text-sm text-gray-700">{reasoning}</p>
                  
                  {/* Scoring Factors */}
                  {allSuggestions[0]?.factors && allSuggestions[0].factors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {allSuggestions[0].factors.slice(0, 4).map((factor, idx) => (
                        <span 
                          key={idx}
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            factor.positive 
                              ? 'bg-green-100 text-green-700' 
                              : factor.urgent 
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {factor.icon} {factor.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => startTask(suggestedTask)}
                  className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
                >
                  Start This Task
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Alternative Suggestions */}
              {allSuggestions.length > 1 && (
                <div className="space-y-2">
                  <button 
                    onClick={() => setShowAlternatives(!showAlternatives)}
                    className="flex items-center gap-2 text-xs font-medium text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    <TrendingUp className="w-3 h-3" />
                    {showAlternatives ? 'Hide' : 'Show'} {allSuggestions.length - 1} alternative{allSuggestions.length > 2 ? 's' : ''}
                    <ChevronRight className={`w-3 h-3 transition-transform ${showAlternatives ? 'rotate-90' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {showAlternatives && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        {allSuggestions.slice(1, 4).map((suggestion, index) => (
                          <motion.div
                            key={suggestion.task.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer"
                            onClick={() => startTask(suggestion.task)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-gray-800 text-sm truncate">{suggestion.task.title}</p>
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {Math.round(suggestion.score)}%
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-2">{suggestion.reasoning}</p>
                                {suggestion.factors && suggestion.factors.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {suggestion.factors.slice(0, 2).map((factor, idx) => (
                                      <span 
                                        key={idx}
                                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                                          factor.positive 
                                            ? 'bg-green-50 text-green-600' 
                                            : 'bg-yellow-50 text-yellow-600'
                                        }`}
                                      >
                                        {factor.icon} {factor.label}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-6"
            >
              <p className="text-gray-600">{reasoning || "Create some tasks to get AI-powered suggestions!"}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}