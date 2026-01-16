import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Zap, Music, Coffee } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function DynamicTemplateGenerator({ selectedTask, currentMood, currentEnergy, onApplyTemplate }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState(null);
  const [mood, setMood] = useState(currentMood || "focused");
  const [energy, setEnergy] = useState(currentEnergy || "medium");

  const generateDynamicTemplate = async () => {
    setIsGenerating(true);
    try {
      const currentTime = new Date().getHours();
      const timeOfDay = currentTime < 12 ? "morning" : currentTime < 17 ? "afternoon" : "evening";
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI focus coach analyzing a user's current state to create the PERFECT focus session setup.

CURRENT STATE:
- Mood: ${mood}
- Energy Level: ${energy}
- Time of Day: ${timeOfDay}
- Task: ${selectedTask?.title || "Not specified"}
- Task Category: ${selectedTask?.category || "general"}
- Task Difficulty: ${selectedTask?.difficulty || "medium"}

Create a personalized focus session template with these recommendations:

1. FOCUS TECHNIQUE: Choose between "standard" (task-based timing) or "pomodoro" (fixed intervals)
   - If energy is LOW or mood is TIRED/ANXIOUS → shorter pomodoro intervals (15-20 min work)
   - If energy is HIGH and mood is FOCUSED/ENERGIZED → longer intervals (45-50 min work) or standard
   - Evening tasks → shorter intervals

2. AMBIENT SOUND: Choose the BEST background sound for their state
   - Options: "rain", "cafe", "forest", "ocean", "white_noise", "brown_noise", "none"
   - TIRED/LOW ENERGY → upbeat sounds (cafe, ocean)
   - ANXIOUS → calming sounds (rain, forest, brown_noise)
   - FOCUSED → minimal sounds (white_noise, none)

3. BREAK ACTIVITIES: Suggest 3 specific break activities suited to their state
   - Each should be 2-5 minutes, restorative, and match their energy/mood
   - Examples: "5-minute walk", "stretch routine", "deep breathing", "quick snack", "hydrate"

4. WORK INTERVAL & BREAK INTERVAL: Specific minutes
   - Balance their current energy with task demands

5. PRE-SESSION RITUAL: A 2-minute activity to transition into focus
   - Should match their mood (energizing if tired, calming if anxious, etc.)

6. REASONING: Brief explanation of why this setup works for their current state

Be specific, personalized, and evidence-based!`,
        response_json_schema: {
          type: "object",
          properties: {
            focus_technique: { type: "string" },
            work_interval: { type: "number" },
            break_interval: { type: "number" },
            ambient_sound: { type: "string" },
            break_activities: {
              type: "array",
              items: { type: "string" }
            },
            pre_session_ritual: { type: "string" },
            reasoning: { type: "string" },
            session_goal_suggestion: { type: "string" }
          }
        }
      });

      setGeneratedTemplate(result);
      toast.success("Generated your perfect focus setup!");
    } catch (error) {
      console.error("Error generating template:", error);
      toast.error("Failed to generate template");
    }
    setIsGenerating(false);
  };

  const applyTemplate = () => {
    if (generatedTemplate) {
      onApplyTemplate({
        ...generatedTemplate,
        name: `Dynamic - ${mood} & ${energy} energy`,
        is_dynamic: true
      });
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-teal-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-600" />
          AI Dynamic Template Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Mood</label>
            <Select value={mood} onValueChange={setMood}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="energized">Energized</SelectItem>
                <SelectItem value="focused">Focused</SelectItem>
                <SelectItem value="tired">Tired</SelectItem>
                <SelectItem value="anxious">Anxious</SelectItem>
                <SelectItem value="overwhelmed">Overwhelmed</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Energy Level</label>
            <Select value={energy} onValueChange={setEnergy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {!generatedTemplate ? (
          <Button
            onClick={generateDynamicTemplate}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing your state...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Perfect Setup
              </>
            )}
          </Button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="p-3 bg-white rounded-lg border border-purple-200">
              <p className="text-xs font-semibold text-purple-900 mb-1">Why this works for you:</p>
              <p className="text-sm text-gray-700">{generatedTemplate.reasoning}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-lg text-center">
                <p className="text-xs text-gray-600 mb-1">Technique</p>
                <Badge className="capitalize">{generatedTemplate.focus_technique}</Badge>
              </div>
              <div className="p-3 bg-white rounded-lg text-center">
                <p className="text-xs text-gray-600 mb-1">Sound</p>
                <Badge className="flex items-center justify-center gap-1">
                  <Music className="w-3 h-3" />
                  {generatedTemplate.ambient_sound.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs font-semibold text-gray-900 mb-2">Pre-Session Ritual:</p>
              <p className="text-sm text-gray-700">{generatedTemplate.pre_session_ritual}</p>
            </div>

            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1">
                <Coffee className="w-3 h-3" />
                Break Activities:
              </p>
              <div className="space-y-1">
                {generatedTemplate.break_activities?.map((activity, idx) => (
                  <p key={idx} className="text-sm text-gray-700">• {activity}</p>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setGeneratedTemplate(null)}
                variant="outline"
                className="flex-1"
              >
                Regenerate
              </Button>
              <Button
                onClick={applyTemplate}
                className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Apply This Setup
              </Button>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}