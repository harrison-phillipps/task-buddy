import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { toast } from "react-hot-toast";

const companions = [
  { id: "robot", name: "Friendly Robot", emoji: "🤖", tagline: "Precise, reliable, always ready" },
  { id: "cat",   name: "Cozy Cat",       emoji: "🐱", tagline: "Calm, gentle, full of warmth" },
  { id: "dog",   name: "Playful Dog",    emoji: "🐶", tagline: "Energetic, loyal, endlessly cheerful" },
  { id: "orb",   name: "Magic Orb",      emoji: "🔮", tagline: "Mystical, wise, otherworldly" },
];

export default function CompanionPickerModal({ open, onOpenChange, currentType, onSaved }) {
  const [selected, setSelected] = useState(currentType || null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await base44.auth.updateMe({ companion_type: selected });
      toast.success("Companion updated!");
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Failed to save companion");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose your companion</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {companions.map((c) => {
            const isSelected = selected === c.id;
            return (
              <motion.button
                key={c.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelected(c.id)}
                className={`relative rounded-2xl border-2 p-4 text-center transition-all duration-200 ${
                  isSelected
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-md"
                    : "border-gray-200 dark:border-gray-700 hover:border-purple-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-white stroke-[3]" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="text-4xl mb-2">{c.emoji}</div>
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{c.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.tagline}</p>
              </motion.button>
            );
          })}
        </div>

        <Button
          onClick={handleSave}
          disabled={!selected || saving}
          className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white"
        >
          {saving ? "Saving…" : "Save companion"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}