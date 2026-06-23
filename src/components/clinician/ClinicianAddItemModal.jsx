import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MobileSelect from "@/components/MobileSelect";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function ClinicianAddItemModal({ open, onOpenChange, itemType, client, clinicianName, onSuccess }) {
  const isTask = itemType === "task";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("personal");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [energyLevel, setEnergyLevel] = useState("medium");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle("");
    setDescription("");
    setCategory("personal");
    setEstimatedMinutes("");
    setEnergyLevel("medium");
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await base44.functions.invoke("addClinicianItem", {
        itemType,
        client_user_id: client.client_user_id,
        title: title.trim(),
        clinician_name: clinicianName,
        category,
        estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
        energy_level: energyLevel,
        description: description.trim() || undefined,
      });
      toast.success(`${isTask ? "Task" : "Goal"} added to ${client.client_display_name}'s account`);
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(`Failed to add ${isTask ? "task" : "goal"}`);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isTask ? "➕ Add Task for" : "🎯 Add Goal for"} {client?.client_display_name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isTask ? "e.g. Morning routine checklist" : "e.g. Build independence in daily tasks"}
              autoFocus
              required
            />
          </div>

          {isTask ? (
            <>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <MobileSelect
                  value={category}
                  onValueChange={setCategory}
                  options={[
                    { value: "personal", label: "🙂 Personal" },
                    { value: "health", label: "💪 Health" },
                    { value: "household", label: "🏠 Household" },
                    { value: "learning", label: "📚 Learning" },
                    { value: "work", label: "💼 Work" },
                    { value: "creative", label: "🎨 Creative" },
                    { value: "other", label: "📌 Other" },
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Estimated time (min)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="480"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(e.target.value)}
                    placeholder="e.g. 30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Energy level</Label>
                  <MobileSelect
                    value={energyLevel}
                    onValueChange={setEnergyLevel}
                    options={[
                      { value: "low", label: "🌿 Low" },
                      { value: "medium", label: "😊 Medium" },
                      { value: "high", label: "⚡ High" },
                    ]}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the goal and what success looks like…"
              />
            </div>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-500">
            This {isTask ? "task" : "goal"} will appear in {client?.client_display_name}'s account labelled "Added by {clinicianName}".
          </p>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 text-white" disabled={saving || !title.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : `Add ${isTask ? "Task" : "Goal"}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}