import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Info, Target, BookOpen, Link, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const DEFAULT_PREFS = {
  considerDeadlines: true,
  considerDependencies: true,
  considerDifficulty: true,
  considerCompletionPatterns: true,
  considerGoalAlignment: true,
  considerSkillDevelopment: true,
  urgencyWeight: 1.0,
  importanceWeight: 1.0,
  goalAlignmentWeight: 1.0,
  learningWeight: 1.0,
  dependencyChainWeight: 1.0,
  workStyle: 'balanced',
  avoidTaskSwitching: false,
  preferDeepWork: false,
};

export default function AIPrioritizationSettings({ currentUser, onUpdate }) {
  const [preferences, setPreferences] = useState({
    ...DEFAULT_PREFS,
    ...currentUser?.ai_prioritization_preferences,
  });
  const [isSaving, setIsSaving] = useState(false);

  const set = (key, value) => setPreferences(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({ ai_prioritization_preferences: preferences });
      toast.success("AI prioritization settings saved");
      onUpdate?.();
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save settings");
    }
    setIsSaving(false);
  };

  const WeightSlider = ({ label, prefKey, description }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 w-10 text-right">
          {(preferences[prefKey] ?? 1.0).toFixed(1)}×
        </span>
      </div>
      <Slider
        value={[preferences[prefKey] ?? 1.0]}
        onValueChange={([val]) => set(prefKey, val)}
        min={0.2}
        max={2.0}
        step={0.1}
      />
      {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
    </div>
  );

  const ToggleRow = ({ id, label, description, prefKey }) => (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <Label htmlFor={id} className="font-medium text-sm">{label}</Label>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      <Switch
        id={id}
        checked={!!preferences[prefKey]}
        onCheckedChange={val => set(prefKey, val)}
      />
    </div>
  );

  return (
    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-100 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Task Prioritization
        </CardTitle>
        <CardDescription>
          Fine-tune how AI scores and orders your tasks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ── Factors to consider ─────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Analysis Factors</p>
          <div className="space-y-4">
            <ToggleRow id="deadlines" label="Deadlines & Urgency" description="Boost tasks with approaching due dates" prefKey="considerDeadlines" />
            <ToggleRow id="deps" label="Task Dependencies" description="Prioritise tasks that unblock a chain of others" prefKey="considerDependencies" />
            <ToggleRow id="difficulty" label="Difficulty & Complexity" description="Factor complexity into timing recommendations" prefKey="considerDifficulty" />
            <ToggleRow id="patterns" label="Completion History" description="Learn from past task completions to predict best order" prefKey="considerCompletionPatterns" />
            <ToggleRow id="goals" label="Goal Alignment" description="Boost tasks tied to your active goals" prefKey="considerGoalAlignment" />
            <ToggleRow id="skills" label="Skill Development" description="Favour learning tasks linked to your skill objectives" prefKey="considerSkillDevelopment" />
          </div>
        </div>

        {/* ── Scoring weights ──────────────────────────────────────────────── */}
        <div className="border-t dark:border-gray-700 pt-4 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Scoring Weights
          </p>
          <WeightSlider label="⏰ Urgency / Deadline" prefKey="urgencyWeight" description="How strongly approaching deadlines inflate a task's score" />
          <WeightSlider label="💥 Importance" prefKey="importanceWeight" description="How strongly MoSCoW (must/should/could) and user priority inflate score" />
          <WeightSlider
            label={<span className="flex items-center gap-1"><Link className="w-3.5 h-3.5 text-blue-500" /> Dependency Chain</span>}
            prefKey="dependencyChainWeight"
            description="Boost for tasks that, when completed, unblock the most subsequent work"
          />
          <WeightSlider
            label={<span className="flex items-center gap-1"><Target className="w-3.5 h-3.5 text-green-500" /> Goal Alignment</span>}
            prefKey="goalAlignmentWeight"
            description="Boost for tasks directly linked to a high-priority goal"
          />
          <WeightSlider
            label={<span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-orange-500" /> Learning & Skills</span>}
            prefKey="learningWeight"
            description="Boost for learning tasks or tasks in your active skill development areas"
          />
        </div>

        {/* ── Work style ──────────────────────────────────────────────────── */}
        <div className="border-t dark:border-gray-700 pt-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Work Style</p>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Preferred working mode</Label>
            <Select value={preferences.workStyle || 'balanced'} onValueChange={v => set('workStyle', v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balanced">⚖️ Balanced — mix of tasks</SelectItem>
                <SelectItem value="deep_work">🧠 Deep Work — cluster similar tasks</SelectItem>
                <SelectItem value="quick_wins">⚡ Quick Wins — short tasks first</SelectItem>
                <SelectItem value="goal_sprint">🎯 Goal Sprint — focus on one goal at a time</SelectItem>
                <SelectItem value="energy_match">🔋 Energy Match — match difficulty to time of day</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ToggleRow id="noSwitch" label="Avoid Task Switching" description="Try to group tasks by category to reduce context switching" prefKey="avoidTaskSwitching" />
          <ToggleRow id="deepWork" label="Prefer Deep Work Blocks" description="Prioritise uninterrupted large tasks over many small ones" prefKey="preferDeepWork" />
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-3 text-sm flex gap-2">
          <Info className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
          <p className="text-gray-700 dark:text-gray-300">
            AI now analyses task dependencies, your active goals, and skill development objectives alongside deadlines and history. Weights let you tune how much each factor influences the final score.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600"
        >
          {isSaving ? "Saving…" : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}