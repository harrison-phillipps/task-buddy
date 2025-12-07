import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Sparkles, Save, RotateCcw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";

const DEFAULT_PERSONALITY = {
  encouragement: 70,
  humor: 40,
  directness: 50,
  wisdom: 30,
  emoji_usage: 50
};

export default function PersonalityCustomizer({ open, onOpenChange, currentUser, onUpdate }) {
  const [personality, setPersonality] = useState(DEFAULT_PERSONALITY);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUser?.companion_personality_custom) {
      setPersonality(currentUser.companion_personality_custom);
    } else {
      setPersonality(DEFAULT_PERSONALITY);
    }
  }, [currentUser]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({
        companion_personality_custom: personality
      });
      onUpdate?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save personality:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPersonality(DEFAULT_PERSONALITY);
  };

  const traitDescriptions = {
    encouragement: {
      low: "Minimal praise, focused on facts",
      mid: "Balanced encouragement",
      high: "Highly supportive and motivating"
    },
    humor: {
      low: "Serious and professional",
      mid: "Occasionally playful",
      high: "Witty and fun"
    },
    directness: {
      low: "Gentle and elaborate",
      mid: "Balanced communication",
      high: "Direct and concise"
    },
    wisdom: {
      low: "Practical and action-focused",
      mid: "Mix of insights and actions",
      high: "Philosophical and reflective"
    },
    emoji_usage: {
      low: "Minimal or no emojis",
      mid: "Occasional emojis",
      high: "Expressive with emojis"
    }
  };

  const getDescription = (trait, value) => {
    if (value <= 30) return traitDescriptions[trait].low;
    if (value <= 70) return traitDescriptions[trait].mid;
    return traitDescriptions[trait].high;
  };

  const traits = [
    { key: "encouragement", label: "Encouragement Level", icon: "💪" },
    { key: "humor", label: "Humor & Playfulness", icon: "😄" },
    { key: "directness", label: "Directness", icon: "🎯" },
    { key: "wisdom", label: "Wisdom & Insight", icon: "🧠" },
    { key: "emoji_usage", label: "Emoji Usage", icon: "✨" }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Customize Your Companion's Personality
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-sm text-gray-600">
            Fine-tune how your companion communicates with you. These settings will influence the tone, 
            style, and content of all messages you receive.
          </p>

          {traits.map((trait, index) => (
            <motion.div
              key={trait.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{trait.icon}</span>
                <Label className="text-base font-semibold">{trait.label}</Label>
              </div>
              
              <Slider
                value={[personality[trait.key]]}
                onValueChange={(value) => 
                  setPersonality({ ...personality, [trait.key]: value[0] })
                }
                min={0}
                max={100}
                step={10}
                className="w-full"
              />
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{personality[trait.key]}%</span>
                <span className="text-purple-600 font-medium">
                  {getDescription(trait.key, personality[trait.key])}
                </span>
              </div>
            </motion.div>
          ))}

          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-700">
              <strong>Pro tip:</strong> Your companion will learn from your interactions. 
              Give feedback on messages to help it adapt even better to your preferences!
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Default
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 text-white"
            >
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Personality
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}