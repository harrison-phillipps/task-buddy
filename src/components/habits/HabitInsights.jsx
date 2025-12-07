import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Calendar, Sparkles, Loader2, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { analyzeHabitPatterns, generateMotivationalMessage } from "./HabitCoach";
import { Progress } from "@/components/ui/progress";

export default function HabitInsights({ open, onOpenChange, habit, completions, userProgress, personality }) {
  const [analysis, setAnalysis] = useState(null);
  const [motivationalMsg, setMotivationalMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && habit) {
      loadInsights();
    }
  }, [open, habit]);

  const loadInsights = async () => {
    setIsLoading(true);
    try {
      const [analysisResult, message] = await Promise.all([
        analyzeHabitPatterns({ habit, completions, userProgress }),
        generateMotivationalMessage({ habit, userProgress, personality })
      ]);
      
      setAnalysis(analysisResult);
      setMotivationalMsg(message);
    } catch (error) {
      console.error("Failed to load insights:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!habit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            AI Insights: {habit.title}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Motivational Message */}
            {motivationalMsg && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg border border-purple-200"
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
                  <p className="text-gray-800 font-medium">{motivationalMsg}</p>
                </div>
              </motion.div>
            )}

            {/* Performance Stats */}
            {analysis && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-teal-600" />
                      <span className="text-sm font-medium text-gray-600">Last 7 Days</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {analysis.weeklyRate.toFixed(0)}%
                      </span>
                      {analysis.weeklyRate >= 80 ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : analysis.weeklyRate >= 50 ? (
                        <TrendingUp className="w-5 h-5 text-yellow-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <Progress value={analysis.weeklyRate} className="h-2 mt-2" />
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-600">Last 30 Days</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {analysis.monthlyRate.toFixed(0)}%
                      </span>
                      {analysis.monthlyRate >= 80 ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : analysis.monthlyRate >= 50 ? (
                        <TrendingUp className="w-5 h-5 text-yellow-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <Progress value={analysis.monthlyRate} className="h-2 mt-2" />
                  </div>
                </div>

                {/* AI Analysis */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Pattern Analysis
                  </h4>
                  <p className="text-gray-700 text-sm mb-3">{analysis.analysis}</p>
                  {analysis.mostSuccessfulDays.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-gray-600">
                        You're most consistent on: <strong>{analysis.mostSuccessfulDays.join(", ")}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* AI Suggestions */}
                {analysis.suggestions && analysis.suggestions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Personalized Suggestions</h4>
                    {analysis.suggestions.map((suggestion, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 bg-white border border-teal-100 rounded-lg"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-teal-700">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 mb-1">{suggestion.tip}</p>
                            <p className="text-sm text-gray-600">{suggestion.reason}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}

            <Button
              onClick={() => onOpenChange(false)}
              className="w-full bg-gradient-to-r from-purple-500 to-teal-500 text-white"
            >
              Got it!
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}