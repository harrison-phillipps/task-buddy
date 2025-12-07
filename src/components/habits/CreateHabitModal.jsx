import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2 } from "lucide-react";
import { generateHabitSuggestions } from "../ai/AIContentGenerator";

const COMMON_HABITS = [
  { icon: '💧', title: 'Drink 8 glasses of water', color: '#3B82F6' },
  { icon: '🏃', title: 'Exercise for 30 minutes', color: '#EF4444' },
  { icon: '📖', title: 'Read for 20 minutes', color: '#8B5CF6' },
  { icon: '🧘', title: 'Meditate for 10 minutes', color: '#14B8A6' },
  { icon: '✍️', title: 'Journal', color: '#F59E0B' },
  { icon: '😴', title: 'Sleep before 11 PM', color: '#6366F1' },
];

export default function CreateHabitModal({ open, onOpenChange, onSuccess }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [targetCount, setTargetCount] = useState(1);
  const [icon, setIcon] = useState("📌");
  const [color, setColor] = useState("#8B5CF6");
  const [reminderTime, setReminderTime] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [habitGoal, setHabitGoal] = useState("");

  const createHabitMutation = useMutation({
    mutationFn: (habitData) => base44.entities.Habit.create(habitData),
    onSuccess: () => {
      onSuccess();
      resetForm();
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setFrequency("daily");
    setTargetCount(1);
    setIcon("📌");
    setColor("#8B5CF6");
    setReminderTime("");
    setDaysOfWeek([]);
  };

  const handleQuickSelect = (habit) => {
    setTitle(habit.title);
    setIcon(habit.icon);
    setColor(habit.color);
  };

  const handleGenerateSuggestions = async () => {
    if (!habitGoal.trim()) return;
    setIsGenerating(true);
    try {
      const generated = await generateHabitSuggestions(habitGoal);
      setSuggestions(generated);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Failed to generate suggestions:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    setTitle(suggestion.title);
    setDescription(suggestion.explanation);
    setFrequency(suggestion.frequency === 'daily' ? 'daily' : 'weekly');
    setShowSuggestions(false);
  };

  const handleDayToggle = (day) => {
    setDaysOfWeek(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    createHabitMutation.mutate({
      title,
      description,
      frequency,
      target_count: targetCount,
      icon,
      color,
      reminder_time: reminderTime || null,
      days_of_week: frequency === 'daily' ? [] : daysOfWeek,
      current_streak: 0,
      longest_streak: 0,
      total_completions: 0,
      is_active: true
    });
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Habit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {!showSuggestions ? (
            <>
              <div className="space-y-2">
                <Label>Get AI Habit Suggestions</Label>
                <div className="flex gap-2">
                  <Input
                    value={habitGoal}
                    onChange={(e) => setHabitGoal(e.target.value)}
                    placeholder="e.g., lose weight, be more productive, reduce stress..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleGenerateSuggestions}
                    disabled={!habitGoal.trim() || isGenerating}
                    className="bg-gradient-to-r from-purple-500 to-teal-500"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Suggest
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Or Choose a Common Habit</Label>
                <div className="grid grid-cols-2 gap-2">
                  {COMMON_HABITS.map((habit, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start"
                      onClick={() => handleQuickSelect(habit)}
                    >
                      <span className="mr-2">{habit.icon}</span>
                      {habit.title}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>AI Suggested Habits</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSuggestions(false)}
                >
                  Back
                </Button>
              </div>
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full h-auto p-4 justify-start text-left"
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  <div className="space-y-1">
                    <div className="font-semibold">{suggestion.title}</div>
                    <div className="text-sm text-gray-600">{suggestion.explanation}</div>
                  </div>
                </Button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Icon</Label>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="text-2xl text-center"
                maxLength={2}
              />
            </div>
            <div className="space-y-2 col-span-3">
              <Label>Habit Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Drink 8 glasses of water"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why is this habit important to you?"
              className="h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Specific Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Times per day</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={targetCount}
                onChange={(e) => setTargetCount(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          {frequency === 'weekly' && (
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="flex gap-2">
                {dayNames.map((day, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant={daysOfWeek.includes(index) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDayToggle(index)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Reminder Time (Optional)</Label>
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Color Theme</Label>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || createHabitMutation.isPending}
              className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500"
            >
              Create Habit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}