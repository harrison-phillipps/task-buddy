import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Save, RotateCcw, Wand2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { toast } from "sonner";
import CompanionArchetypeSelector, { ARCHETYPES } from "./CompanionArchetypeSelector";

const DEFAULT_TRAITS = {
  encouragement: 70,
  humor: 40,
  directness: 50,
  wisdom: 30,
  formality: 40,
  empathy: 60
};

const DEFAULT_PREFERENCES = {
  emoji_usage: "moderate",
  message_length: "balanced",
  check_in_frequency: "occasional"
};

export default function DeepPersonalityCustomizer({ open, onOpenChange, currentUser, onUpdate }) {
  const [archetype, setArchetype] = useState(currentUser?.companion_archetype || null);
  const [traits, setTraits] = useState(DEFAULT_TRAITS);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setArchetype(currentUser.companion_archetype || null);
      setTraits(currentUser.companion_traits || DEFAULT_TRAITS);
      setPreferences(currentUser.companion_preferences || DEFAULT_PREFERENCES);
    }
  }, [currentUser]);

  const handleArchetypeSelect = (archetypeId) => {
    setArchetype(archetypeId);
    const selectedArchetype = ARCHETYPES.find(a => a.id === archetypeId);
    if (selectedArchetype) {
      setTraits(selectedArchetype.traits);
      toast.success(`Archetype updated to ${selectedArchetype.name}!`);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({
        companion_archetype: archetype,
        companion_traits: traits,
        companion_preferences: preferences
      });
      toast.success("Companion personality saved!");
      onUpdate?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save personality:", error);
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setArchetype(null);
    setTraits(DEFAULT_TRAITS);
    setPreferences(DEFAULT_PREFERENCES);
    toast.info("Reset to defaults");
  };

  const traitDefinitions = [
    { 
      key: "encouragement", 
      label: "Encouragement", 
      icon: "💪",
      low: "Minimal praise",
      high: "Highly motivating"
    },
    { 
      key: "humor", 
      label: "Humor & Playfulness", 
      icon: "😄",
      low: "Serious tone",
      high: "Witty and fun"
    },
    { 
      key: "directness", 
      label: "Directness", 
      icon: "🎯",
      low: "Gentle and elaborate",
      high: "Direct and concise"
    },
    { 
      key: "wisdom", 
      label: "Wisdom & Philosophy", 
      icon: "🧠",
      low: "Action-focused",
      high: "Reflective insights"
    },
    { 
      key: "formality", 
      label: "Formality", 
      icon: "👔",
      low: "Casual and friendly",
      high: "Professional tone"
    },
    { 
      key: "empathy", 
      label: "Empathy & Support", 
      icon: "❤️",
      low: "Task-focused",
      high: "Emotionally supportive"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-600" />
            Deep Companion Customization
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="archetype" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="archetype">Archetype</TabsTrigger>
            <TabsTrigger value="traits">Traits</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="archetype" className="space-y-4">
            <p className="text-sm text-gray-600">
              Choose a companion archetype that matches your needs. Each archetype has a unique personality and communication style.
            </p>
            <CompanionArchetypeSelector 
              currentArchetype={archetype}
              onSelect={handleArchetypeSelect}
            />
          </TabsContent>

          <TabsContent value="traits" className="space-y-6 py-4">
            <p className="text-sm text-gray-600">
              Fine-tune your companion's personality traits. These settings control how your companion communicates across all interactions.
            </p>

            {traitDefinitions.map((trait, index) => (
              <motion.div
                key={trait.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{trait.icon}</span>
                  <Label className="text-base font-semibold">{trait.label}</Label>
                </div>
                
                <Slider
                  value={[traits[trait.key]]}
                  onValueChange={(value) => 
                    setTraits({ ...traits, [trait.key]: value[0] })
                  }
                  min={0}
                  max={100}
                  step={10}
                  className="w-full"
                />
                
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{trait.low}</span>
                  <span className="font-semibold text-purple-600">{traits[trait.key]}%</span>
                  <span>{trait.high}</span>
                </div>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6 py-4">
            <p className="text-sm text-gray-600">
              Customize how your companion interacts with you throughout your day.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Emoji Usage</Label>
                <Select 
                  value={preferences.emoji_usage} 
                  onValueChange={(value) => setPreferences({ ...preferences, emoji_usage: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None - No emojis</SelectItem>
                    <SelectItem value="minimal">Minimal - Rare emojis</SelectItem>
                    <SelectItem value="moderate">Moderate - Balanced usage</SelectItem>
                    <SelectItem value="expressive">Expressive - Frequent emojis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Message Length</Label>
                <Select 
                  value={preferences.message_length} 
                  onValueChange={(value) => setPreferences({ ...preferences, message_length: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brief">Brief - Short and concise</SelectItem>
                    <SelectItem value="balanced">Balanced - Moderate length</SelectItem>
                    <SelectItem value="detailed">Detailed - Comprehensive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Check-in Frequency</Label>
                <Select 
                  value={preferences.check_in_frequency} 
                  onValueChange={(value) => setPreferences({ ...preferences, check_in_frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal - Only when asked</SelectItem>
                    <SelectItem value="occasional">Occasional - Balanced</SelectItem>
                    <SelectItem value="frequent">Frequent - Regular check-ins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-700">
                <strong>💡 AI Learning:</strong> Your companion uses these preferences to tailor all responses, 
                including focus coaching, mood guidance, and task suggestions.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All
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
      </DialogContent>
    </Dialog>
  );
}