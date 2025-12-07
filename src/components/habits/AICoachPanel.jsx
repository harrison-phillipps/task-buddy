import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Lightbulb, Target, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { generateQuickTip, generateHabitRecommendations } from "./HabitCoach";

export default function AICoachPanel({ habits, userProgress, onRecommendationSelect, personality }) {
  const [quickTip, setQuickTip] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [isLoadingTip, setIsLoadingTip] = useState(false);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);

  useEffect(() => {
    loadQuickTip();
  }, [habits, userProgress]);

  const loadQuickTip = async () => {
    setIsLoadingTip(true);
    try {
      const tip = await generateQuickTip({ habits, userProgress, personality });
      setQuickTip(tip);
    } catch (error) {
      console.error("Failed to load tip:", error);
    } finally {
      setIsLoadingTip(false);
    }
  };

  const loadRecommendations = async () => {
    setIsLoadingRecs(true);
    setShowRecommendations(true);
    try {
      const recs = await generateHabitRecommendations({
        currentHabits: habits.filter(h => h.is_active),
        userProgress
      });
      setRecommendations(recs);
    } catch (error) {
      console.error("Failed to load recommendations:", error);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const difficultyColors = {
    easy: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    hard: "bg-red-100 text-red-800"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Quick Tip Card */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                AI Coach Tip
                <Sparkles className="w-4 h-4 text-purple-600" />
              </h3>
              {isLoadingTip ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Analyzing your habits...</span>
                </div>
              ) : (
                <p className="text-gray-700 text-sm leading-relaxed">{quickTip}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations Section */}
      <Card className="border-teal-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-teal-600" />
              Personalized Recommendations
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => showRecommendations ? setShowRecommendations(false) : loadRecommendations()}
            >
              {showRecommendations ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Show
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        
        <AnimatePresence>
          {showRecommendations && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <CardContent className="space-y-3">
                {isLoadingRecs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                  </div>
                ) : recommendations.length > 0 ? (
                  recommendations.map((rec, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 bg-white border border-teal-100 rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => onRecommendationSelect(rec)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{rec.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">{rec.reason}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {rec.frequency}
                            </Badge>
                            <Badge className={`text-xs ${difficultyColors[rec.difficulty]}`}>
                              {rec.difficulty}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-shrink-0"
                        >
                          Add
                        </Button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600 text-center py-4">
                    Click "Show" to get personalized habit recommendations!
                  </p>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}