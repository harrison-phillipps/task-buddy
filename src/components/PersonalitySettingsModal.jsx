import React, { useState, useEffect } from "react";
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import CompanionPersonalitySelector from "./CompanionPersonalitySelector";

export default function PersonalitySettingsModal({ open, onOpenChange, currentUser, onUpdate }) {
  const [personality, setPersonality] = useState(currentUser?.companion_personality || "motivational");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUser?.companion_personality) {
      setPersonality(currentUser.companion_personality);
    }
  }, [currentUser]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({ companion_personality: personality });
      if (onUpdate) onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving personality:", error);
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Companion Personality</DialogTitle>
          <DialogDescription>
            Choose how your companion talks to you
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <CompanionPersonalitySelector
            selected={personality}
            onSelect={setPersonality}
            compact
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-purple-500 to-teal-500 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}