import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coffee, Wind, Sparkles, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function AdaptiveBreakSuggestion({ 
  sessionState,
  journeyData,
  onTakeBreak,
  onDismiss
}) {
  const [suggestion, setSuggestion] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastCheck, setLastCheck] = useState(Date.now());

  useEffect(() => {
    if (!sessionState.isActive || sessionState.isBreakTime) return;

    // Check every 10 minutes during active session
    const checkInterval = setInterval(() => {
      analyzeBreakNeed();
    }, 600000); // 10 minutes

    return () => clearInterval(checkInterval);
  }, [sessionState.isActive, sessionState.isBreakTime]);

  const analyzeBreakNeed = async () => {
    if (isAnalyzing || Date.now() - lastCheck < 300000) return; // Don't check more than once per 5 min
    
    setIsAnalyzing(true);
    setLastCheck(Date.now());

    try {
      const sessionDuration = sessionState.sessionStartTime 
        ? Math.round((Date.now() - sessionState.sessionStartTime) / 60000)
        : 0;

      const progress = sessionState.completedSubtasks / sessionState.totalSubtasks;
      
      // Recent mood patterns
      const recentSessions = journeyData?.slice(0, 10) || [];
      const moodPatterns = recentSessions
        .filter(s => s.mood_before && s.mood_after)
        .map(s => ({
          before: s.mood_before,
          after: s.mood_after,
          effectiveness: s.effectiveness_score,
          mindfulness: s.mindfulness_used
        }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI focus coach monitoring a live work session. Analyze if the user needs a break NOW.

CURRENT SESSION STATE:
- Duration: ${sessionDuration} minutes
- Progress: ${Math.round(progress * 100)}% (${sessionState.completedSubtasks}/${sessionState.totalSubtasks} subtasks)
- Pauses taken: ${sessionState.pauseCount}
- Current mood: ${sessionState.moodBefore}
- Time remaining: ${Math.floor(sessionState.timeLeft / 60)} minutes
- Technique: ${sessionState.focusTechnique}

HISTORICAL MOOD PATTERNS:
${JSON.stringify(moodPatterns, null, 2)}

ANALYZE AND DECIDE:

1. BREAK URGENCY (0-100)
   - 0-30: No break needed
   - 31-60: Break recommended soon
   - 61-100: Break needed now

2. RECOMMENDED BREAK TYPE
   - "physical": Movement break (stretching, walking)
   - "mindfulness": Breathing or meditation
   - "rest": Quick power rest
   - "hydration": Drink water, light snack
   - "none": No break needed

3. OPTIMAL DURATION (3-10 minutes)
   - Based on session length and progress

4. SPECIFIC ACTIVITIES
   - 2-3 concrete activities for this break
   - Personalized to their mood patterns

5. MINDFULNESS INTEGRATION
   - Should include guided mindfulness? (true/false)
   - If yes, type: breathing, meditation, or body_scan
   - Duration for mindfulness: 2-5 minutes

6. REASONING
   - Why this break suggestion now?

Only suggest a break if urgency > 30. Be smart about timing!`,
        response_json_schema: {
          type: "object",
          properties: {
            break_urgency: { type: "number" },
            break_type: { type: "string" },
            duration_minutes: { type: "number" },
            activities: {
              type: "array",
              items: { type: "string" }
            },
            include_mindfulness: { type: "boolean" },
            mindfulness_type: { type: "string" },
            mindfulness_duration: { type: "number" },
            reasoning: { type: "string" }
          }
        }
      });

      if (result.break_urgency > 30) {
        setSuggestion(result);
        toast.info("Smart break suggestion available", { duration: 3000 });
      }
    } catch (error) {
      console.error("Error analyzing break need:", error);
    }
    setIsAnalyzing(false);
  };

  const handleTakeBreak = () => {
    if (suggestion) {
      onTakeBreak({
        duration: suggestion.duration_minutes,
        type: suggestion.break_type,
        activities: suggestion.activities,
        includeMindfulness: suggestion.include_mindfulness,
        mindfulnessType: suggestion.mindfulness_type,
        mindfulnessDuration: suggestion.mindfulness_duration
      });
      setSuggestion(null);
    }
  };

  const getUrgencyColor = (urgency) => {
    if (urgency >= 61) return "from-red-500 to-orange-500";
    if (urgency >= 31) return "from-yellow-500 to-orange-500";
    return "from-blue-500 to-teal-500";
  };

  const getBreakIcon = (type) => {
    switch (type) {
      case "mindfulness": return Wind;
      case "physical": return Sparkles;
      default: return Coffee;
    }
  };

  if (!suggestion) return null;

  const Icon = getBreakIcon(suggestion.break_type);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        className="fixed bottom-6 right-6 z-50 max-w-sm"
      >
        <Card className={`bg-gradient-to-br ${getUrgencyColor(suggestion.break_urgency)} border-2 border-white shadow-2xl`}>
          <CardContent className="p-4 text-white">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-white/30 text-white text-xs">
                    AI Break Coach
                  </Badge>
                  {suggestion.break_urgency >= 61 && (
                    <Badge className="bg-red-600 text-white text-xs">
                      Urgent
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-auto hover:bg-white/20"
                    onClick={() => {
                      setSuggestion(null);
                      onDismiss?.();
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                <p className="font-semibold text-sm mb-1">Time for a {suggestion.break_type} break!</p>
                <p className="text-xs text-white/90 mb-3">{suggestion.reasoning}</p>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Coffee className="w-3 h-3" />
                    <span>{suggestion.duration_minutes} minute break</span>
                  </div>
                  {suggestion.include_mindfulness && (
                    <div className="flex items-center gap-2 text-xs">
                      <Wind className="w-3 h-3" />
                      <span>{suggestion.mindfulness_duration}min {suggestion.mindfulness_type}</span>
                    </div>
                  )}
                </div>

                <div className="bg-white/10 rounded-lg p-2 mb-3">
                  <p className="text-xs font-medium mb-1">Suggested activities:</p>
                  {suggestion.activities?.map((activity, idx) => (
                    <p key={idx} className="text-xs text-white/90">• {activity}</p>
                  ))}
                </div>

                <Button
                  onClick={handleTakeBreak}
                  size="sm"
                  className="w-full bg-white text-gray-900 hover:bg-white/90"
                >
                  Take This Break
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}