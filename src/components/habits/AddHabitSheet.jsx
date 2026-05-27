import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const QUICK_PICKS = {
  morning: [
    { icon: '💧', title: 'Drink a glass of water' },
    { icon: '🧘', title: 'Meditate for 10 minutes' },
    { icon: '📖', title: 'Read for 20 minutes' },
    { icon: '✍️', title: 'Journal' },
    { icon: '🏃', title: 'Morning exercise' },
    { icon: '🥗', title: 'Eat a healthy breakfast' },
    { icon: '🚿', title: 'Cold shower' },
    { icon: '📝', title: 'Plan the day' },
  ],
  evening: [
    { icon: '😴', title: 'Be in bed by 10 PM' },
    { icon: '📵', title: 'No screens 30 min before bed' },
    { icon: '🧘', title: 'Wind-down stretch' },
    { icon: '✍️', title: 'Gratitude journal' },
    { icon: '📖', title: 'Read a book' },
    { icon: '🫖', title: 'Herbal tea' },
    { icon: '🧹', title: 'Tidy workspace' },
    { icon: '🌙', title: 'Review tomorrow\'s tasks' },
  ],
  anytime: [
    { icon: '💧', title: 'Drink 8 glasses of water' },
    { icon: '🏃', title: 'Exercise for 30 minutes' },
    { icon: '📖', title: 'Read for 20 minutes' },
    { icon: '🧘', title: 'Meditate' },
    { icon: '🚶', title: 'Take a walk' },
    { icon: '💊', title: 'Take vitamins' },
    { icon: '📵', title: 'Digital detox hour' },
    { icon: '🎯', title: 'Review goals' },
  ]
};

export default function AddHabitSheet({ open, onOpenChange, routine, onSuccess }) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("📌");
  const [saving, setSaving] = useState(false);

  const handleQuick = (pick) => {
    setTitle(pick.title);
    setIcon(pick.icon);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await base44.entities.Habit.create({
      title: title.trim(),
      icon,
      routine,
      frequency: "daily",
      target_count: 1,
      current_streak: 0,
      longest_streak: 0,
      total_completions: 0,
      is_active: true,
    });
    setSaving(false);
    setTitle("");
    setIcon("📌");
    onOpenChange(false);
    onSuccess();
  };

  const picks = QUICK_PICKS[routine] || QUICK_PICKS.anytime;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Habit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Quick picks</Label>
            <div className="grid grid-cols-2 gap-2">
              {picks.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleQuick(p)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-sm transition-all ${title === p.title ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 dark:border-gray-600 dark:hover:bg-gray-700'}`}
                >
                  <span className="text-lg">{p.icon}</span>
                  <span className="text-gray-700 dark:text-gray-300 text-xs leading-tight">{p.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Or create custom</Label>
            <div className="flex gap-2">
              <Input
                value={icon}
                onChange={e => setIcon(e.target.value)}
                className="w-14 text-center text-lg"
                maxLength={2}
              />
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Habit name..."
                className="flex-1"
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 text-white"
              disabled={!title.trim() || saving}
              onClick={handleSave}
            >
              {saving ? "Saving…" : "Add Habit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}