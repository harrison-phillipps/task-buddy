import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Heart, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function PostSessionMoodReflection({ 
  moodBefore, 
  moodAfter, 
  sessionData,
  onComplete 
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reflection, setReflection] = useState(null);
  const [userNotes, setUserNotes] = useState("");

  const generateReflection = async () => {
    setIsGenerating(true);
    try {
      const moodShift = moodBefore !== moodAfter;
      const wasEffective = (sessionData.subtasksCompleted / sessionData.totalSubtasks) >= 0.7;
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI Mood Coach helping a user reflect on their focus session and mood journey.

SESSION DATA:
- Started feeling: ${moodBefore}
- Ended feeling: ${moodAfter}
- Mood shifted: ${moodShift ? 'Yes' : 'No'}
- Technique: ${sessionData.focusTechnique}
- Duration: ${sessionData.totalMinutes} minutes
- Completed: ${sessionData.subtasksCompleted}/${sessionData.totalSubtasks} subtasks
- Effective session: ${wasEffective ? 'Yes' : 'No'}
- Goal achieved: ${sessionData.goalData?.goalAchieved ? 'Yes' : 'No'}

CREATE A PERSONALIZED POST-SESSION REFLECTION:

1. MOOD SHIFT ANALYSIS
   - What does this mood change tell us?
   - Is this shift positive for their wellbeing?
   - What might have caused this shift?

2. CELEBRATION OR ACKNOWLEDGMENT
   - If mood improved: celebrate and reinforce what worked
   - If mood same: acknowledge consistency
   - If mood declined: compassionate support and learning opportunity

3. ACTIONABLE INSIGHTS
   - What can they learn from this session?
   - What should they repeat next time?
   - What should they adjust?

4. REFLECTION PROMPT
   - A thoughtful question for them to journal about
   - Helps them process the experience
   - Encourages growth mindset

5. NEXT SESSION SUGGESTION
   - Based on this session's outcome
   - Specific and encouraging

Be warm, supportive, and insightful. This is about growth, not judgment.`,
        response_json_schema: {
          type: "object",
          properties: {
            mood_shift_insight: { type: "string" },
            celebration_message: { type: "string" },
            key_takeaway: { type: "string" },
            reflection_prompt: { type: "string" },
            next_session_tip: { type: "string" }
          }
        }
      });

      setReflection(result);
      toast.success("Reflection ready!");
    } catch (error) {
      console.error("Error generating reflection:", error);
      toast.error("Failed to generate reflection");
    }
    setIsGenerating(false);
  };

  React.useEffect(() => {
    generateReflection();
  }, []);

  const getMoodEmoji = (mood) => {
    const emojis = {
      energized: "⚡",
      focused: "🎯",
      tired: "😴",
      anxious: "😰",
      neutral: "😐",
      accomplished: "🎉",
      frustrated: "😤"
    };
    return emojis[mood] || "😊";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-pink-900">
            <Heart className="w-5 h-5" />
            Your Mood Journey Today
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-4 p-4 bg-white rounded-lg">
            <div className="text-center">
              <span className="text-3xl">{getMoodEmoji(moodBefore)}</span>
              <p className="text-sm font-medium text-gray-700 capitalize mt-1">{moodBefore}</p>
              <Badge variant="outline" className="mt-1 text-xs">Before</Badge>
            </div>
            <ArrowRight className="w-6 h-6 text-purple-400" />
            <div className="text-center">
              <span className="text-3xl">{getMoodEmoji(moodAfter)}</span>
              <p className="text-sm font-medium text-gray-700 capitalize mt-1">{moodAfter}</p>
              <Badge variant="outline" className="mt-1 text-xs">After</Badge>
            </div>
          </div>

          {isGenerating ? (
            <div className="text-center py-6">
              <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-purple-600" />
              <p className="text-sm text-gray-600">Analyzing your session...</p>
            </div>
          ) : reflection ? (
            <div className="space-y-3">
              <div className="p-3 bg-white rounded-lg">
                <p className="text-xs font-semibold text-purple-900 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Mood Shift Insight:
                </p>
                <p className="text-sm text-gray-700">{reflection.mood_shift_insight}</p>
              </div>

              <div className="p-3 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-900">{reflection.celebration_message}</p>
              </div>

              <div className="p-3 bg-white rounded-lg">
                <p className="text-xs font-semibold text-gray-900 mb-1">Key Takeaway:</p>
                <p className="text-sm text-gray-700">{reflection.key_takeaway}</p>
              </div>

              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs font-semibold text-purple-900 mb-2">Reflection Question:</p>
                <p className="text-sm text-purple-700 italic mb-3">{reflection.reflection_prompt}</p>
                <Textarea
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="Your thoughts... (optional)"
                  className="h-20 bg-white"
                />
              </div>

              <div className="p-3 bg-white rounded-lg">
                <p className="text-xs font-semibold text-gray-900 mb-1">For Next Session:</p>
                <p className="text-sm text-gray-700">{reflection.next_session_tip}</p>
              </div>

              <Button
                onClick={() => onComplete(userNotes)}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
              >
                Continue to Summary
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}