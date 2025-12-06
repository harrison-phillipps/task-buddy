import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

export default function CreateGoalModal({ open, onOpenChange, onSuccess }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("personal");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [keyResults, setKeyResults] = useState([]);

  const createGoalMutation = useMutation({
    mutationFn: (goalData) => base44.entities.Goal.create(goalData),
    onSuccess: () => {
      onSuccess();
      resetForm();
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType("personal");
    setTargetDate("");
    setPriority("medium");
    setKeyResults([]);
  };

  const handleAddKeyResult = () => {
    setKeyResults([...keyResults, { title: "", target_value: 0, current_value: 0, unit: "" }]);
  };

  const handleRemoveKeyResult = (index) => {
    setKeyResults(keyResults.filter((_, i) => i !== index));
  };

  const handleKeyResultChange = (index, field, value) => {
    const updated = [...keyResults];
    updated[index][field] = value;
    setKeyResults(updated);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    createGoalMutation.mutate({
      title,
      description,
      type,
      target_date: targetDate || null,
      priority,
      key_results: keyResults.filter(kr => kr.title && kr.target_value > 0),
      status: "not_started"
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Goal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Goal Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Increase revenue by 30%"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does success look like?"
              className="h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Goal Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="okr">OKR</SelectItem>
                  <SelectItem value="quarterly">Quarterly Goal</SelectItem>
                  <SelectItem value="annual">Annual Goal</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                  <SelectItem value="personal">Personal Goal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target Date</Label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Key Results (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddKeyResult}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Key Result
              </Button>
            </div>

            {keyResults.map((kr, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-2 bg-gray-50">
                <div className="flex gap-2">
                  <Input
                    placeholder="Key result title"
                    value={kr.title}
                    onChange={(e) => handleKeyResultChange(index, 'title', e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveKeyResult(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    placeholder="Current"
                    value={kr.current_value}
                    onChange={(e) => handleKeyResultChange(index, 'current_value', parseFloat(e.target.value) || 0)}
                  />
                  <Input
                    type="number"
                    placeholder="Target"
                    value={kr.target_value}
                    onChange={(e) => handleKeyResultChange(index, 'target_value', parseFloat(e.target.value) || 0)}
                  />
                  <Input
                    placeholder="Unit"
                    value={kr.unit}
                    onChange={(e) => handleKeyResultChange(index, 'unit', e.target.value)}
                  />
                </div>
              </div>
            ))}
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
              disabled={!title.trim() || createGoalMutation.isPending}
              className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500"
            >
              Create Goal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}