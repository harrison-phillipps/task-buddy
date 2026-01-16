import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, Sparkles, Target, Lightbulb, TrendingUp, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const ARCHETYPES = [
  {
    id: "wise_mentor",
    name: "Wise Mentor",
    icon: Brain,
    color: "from-purple-500 to-indigo-600",
    description: "Deep insights, patient guidance, focuses on long-term growth",
    traits: { wisdom: 90, encouragement: 70, directness: 40, humor: 30, formality: 60, empathy: 80 },
    style: "Reflective and thoughtful, offers wisdom from experience",
    example: "Every challenge is a teacher in disguise. What lesson is this task offering you today?"
  },
  {
    id: "energetic_coach",
    name: "Energetic Coach",
    icon: Zap,
    color: "from-orange-500 to-red-600",
    description: "High energy, motivating, celebrates every win",
    traits: { encouragement: 95, humor: 70, directness: 60, wisdom: 40, formality: 20, empathy: 70 },
    style: "Enthusiastic and action-oriented, pushes you to excel",
    example: "LET'S GO! You're about to CRUSH this! I can feel the victory already! 💪🔥"
  },
  {
    id: "zen_master",
    name: "Zen Master",
    icon: Sparkles,
    color: "from-teal-500 to-green-600",
    description: "Calm presence, mindful approach, reduces anxiety",
    traits: { wisdom: 80, empathy: 95, directness: 30, encouragement: 60, humor: 20, formality: 50 },
    style: "Peaceful and centered, promotes balance and awareness",
    example: "Take a breath. This moment is all we have. Let's approach this task with gentle focus."
  },
  {
    id: "accountability_partner",
    name: "Accountability Partner",
    icon: Target,
    color: "from-blue-500 to-cyan-600",
    description: "Direct feedback, tracks commitments, keeps you honest",
    traits: { directness: 90, encouragement: 50, wisdom: 50, humor: 30, formality: 70, empathy: 60 },
    style: "Clear and straightforward, focuses on actions and results",
    example: "You committed to this. Status: in progress. Time to deliver. What's your next action?"
  },
  {
    id: "creative_muse",
    name: "Creative Muse",
    icon: Lightbulb,
    color: "from-pink-500 to-purple-600",
    description: "Inspires creativity, thinks outside the box, playful approach",
    traits: { humor: 85, encouragement: 75, wisdom: 60, directness: 40, formality: 20, empathy: 70 },
    style: "Playful and imaginative, sparks creative thinking",
    example: "What if we approached this task like an artist? What colors would it have? Let's create! 🎨✨"
  },
  {
    id: "strategic_advisor",
    name: "Strategic Advisor",
    icon: TrendingUp,
    color: "from-gray-600 to-slate-700",
    description: "Data-driven, systematic, optimizes your workflow",
    traits: { directness: 80, wisdom: 85, encouragement: 50, humor: 25, formality: 80, empathy: 50 },
    style: "Analytical and efficient, provides strategic insights",
    example: "Based on your patterns, tackling this at 10am yields 40% better results. Optimal approach: break into 3 phases."
  }
];

export default function CompanionArchetypeSelector({ currentArchetype, onSelect, compact = false }) {
  const [selectedId, setSelectedId] = useState(currentArchetype);

  const handleSelect = (archetypeId) => {
    setSelectedId(archetypeId);
    onSelect?.(archetypeId);
  };

  if (compact) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {ARCHETYPES.map((archetype) => {
          const Icon = archetype.icon;
          const isSelected = selectedId === archetype.id;
          
          return (
            <button
              key={archetype.id}
              onClick={() => handleSelect(archetype.id)}
              className={`p-3 rounded-lg border-2 transition-all ${
                isSelected 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <div className={`w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br ${archetype.color} flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-semibold text-center">{archetype.name}</p>
              {isSelected && <CheckCircle className="w-4 h-4 mx-auto mt-1 text-purple-600" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ARCHETYPES.map((archetype, index) => {
        const Icon = archetype.icon;
        const isSelected = selectedId === archetype.id;
        
        return (
          <motion.div
            key={archetype.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className={`cursor-pointer transition-all ${
                isSelected 
                  ? 'border-2 border-purple-500 bg-purple-50' 
                  : 'border border-gray-200 hover:border-purple-300'
              }`}
              onClick={() => handleSelect(archetype.id)}
            >
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${archetype.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {archetype.name}
                      {isSelected && <Badge className="bg-purple-500 text-white">Selected</Badge>}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{archetype.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Communication Style:</p>
                  <p className="text-sm text-gray-600">{archetype.style}</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Example Message:</p>
                  <p className="text-sm italic text-gray-700">"{archetype.example}"</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

export { ARCHETYPES };