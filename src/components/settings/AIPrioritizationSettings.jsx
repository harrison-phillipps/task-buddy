import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Sparkles, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AIPrioritizationSettings({ currentUser, onUpdate }) {
  const [preferences, setPreferences] = useState({
    considerDeadlines: true,
    considerDependencies: true,
    considerDifficulty: true,
    considerCompletionPatterns: true,
    urgencyWeight: 1.0,
    importanceWeight: 1.0,
    ...currentUser?.ai_prioritization_preferences
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({
        ai_prioritization_preferences: preferences
      });
      toast.success("AI prioritization settings saved");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save settings");
    }
    setIsSaving(false);
  };

  const updatePreference = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Task Prioritization
        </CardTitle>
        <CardDescription>
          Fine-tune how AI analyzes and prioritizes your tasks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="deadlines" className="font-medium">Consider Deadlines</Label>
              <p className="text-xs text-gray-500">Prioritize tasks with approaching due dates</p>
            </div>
            <Switch
              id="deadlines"
              checked={preferences.considerDeadlines}
              onCheckedChange={(val) => updatePreference('considerDeadlines', val)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="dependencies" className="font-medium">Consider Dependencies</Label>
              <p className="text-xs text-gray-500">Prioritize tasks that unblock others</p>
            </div>
            <Switch
              id="dependencies"
              checked={preferences.considerDependencies}
              onCheckedChange={(val) => updatePreference('considerDependencies', val)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="difficulty" className="font-medium">Consider Difficulty</Label>
              <p className="text-xs text-gray-500">Factor in task complexity when prioritizing</p>
            </div>
            <Switch
              id="difficulty"
              checked={preferences.considerDifficulty}
              onCheckedChange={(val) => updatePreference('considerDifficulty', val)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="patterns" className="font-medium">Learn from Completion Patterns</Label>
              <p className="text-xs text-gray-500">Use your work history to suggest better task order</p>
            </div>
            <Switch
              id="patterns"
              checked={preferences.considerCompletionPatterns}
              onCheckedChange={(val) => updatePreference('considerCompletionPatterns', val)}
            />
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Urgency Weight</Label>
              <span className="text-sm font-medium text-purple-600">{preferences.urgencyWeight.toFixed(1)}x</span>
            </div>
            <Slider
              value={[preferences.urgencyWeight]}
              onValueChange={([val]) => updatePreference('urgencyWeight', val)}
              min={0.5}
              max={2.0}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-gray-500">How much to prioritize time-sensitive tasks</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Importance Weight</Label>
              <span className="text-sm font-medium text-purple-600">{preferences.importanceWeight.toFixed(1)}x</span>
            </div>
            <Slider
              value={[preferences.importanceWeight]}
              onValueChange={([val]) => updatePreference('importanceWeight', val)}
              min={0.5}
              max={2.0}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-gray-500">How much to prioritize high-impact tasks</p>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <p className="text-gray-700">
              AI analyzes your task details, historical completion patterns, and current workload to suggest optimal task order. 
              Adjust these settings to match your working style.
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600"
        >
          {isSaving ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}