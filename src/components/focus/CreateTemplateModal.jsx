import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

const COLORS = [
  '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'
];

export default function CreateTemplateModal({ open, onOpenChange, template, currentUser }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    focus_technique: 'standard',
    work_interval: 25,
    break_interval: 5,
    ambient_sound: 'none',
    enable_focus_bot: true,
    session_goal_type: 'none',
    session_goal_value: null,
    category_filter: '',
    difficulty_filter: '',
    color: '#8B5CF6'
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return base44.entities.Task.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser && open,
  });

  useEffect(() => {
    if (template) {
      setFormData(template);
    } else {
      setFormData({
        name: '',
        description: '',
        focus_technique: 'standard',
        work_interval: 25,
        break_interval: 5,
        ambient_sound: 'none',
        enable_focus_bot: true,
        session_goal_type: 'none',
        session_goal_value: null,
        category_filter: '',
        difficulty_filter: '',
        color: '#8B5CF6'
      });
    }
  }, [template, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (template) {
        return base44.entities.FocusSessionTemplate.update(template.id, data);
      }
      return base44.entities.FocusSessionTemplate.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focusTemplates'] });
      onOpenChange(false);
    },
  });

  const handleSave = () => {
    if (!formData.name.trim()) return;
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Template' : 'Create Focus Session Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Template Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Deep Work Session, Morning Focus..."
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What is this template for?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color ? 'border-gray-900' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Focus Technique</Label>
              <Select
                value={formData.focus_technique}
                onValueChange={(value) => setFormData({ ...formData, focus_technique: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="pomodoro">Pomodoro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ambient Sound</Label>
              <Select
                value={formData.ambient_sound}
                onValueChange={(value) => setFormData({ ...formData, ambient_sound: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="rain">Rain</SelectItem>
                  <SelectItem value="cafe">Cafe</SelectItem>
                  <SelectItem value="forest">Forest</SelectItem>
                  <SelectItem value="ocean">Ocean</SelectItem>
                  <SelectItem value="white_noise">White Noise</SelectItem>
                  <SelectItem value="brown_noise">Brown Noise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.focus_technique === 'pomodoro' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Work Interval: {formData.work_interval}m</Label>
                <Slider
                  value={[formData.work_interval]}
                  onValueChange={(value) => setFormData({ ...formData, work_interval: value[0] })}
                  min={10}
                  max={60}
                  step={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Break Interval: {formData.break_interval}m</Label>
                <Slider
                  value={[formData.break_interval]}
                  onValueChange={(value) => setFormData({ ...formData, break_interval: value[0] })}
                  min={3}
                  max={15}
                  step={1}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Session Goal</Label>
            <Select
              value={formData.session_goal_type}
              onValueChange={(value) => setFormData({ ...formData, session_goal_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Goal</SelectItem>
                <SelectItem value="subtasks">Complete X Subtasks</SelectItem>
                <SelectItem value="time">Focus for X Minutes</SelectItem>
                <SelectItem value="pomodoros">Complete X Pomodoros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.session_goal_type !== 'none' && (
            <div className="space-y-2">
              <Label>Goal Value</Label>
              <Input
                type="number"
                value={formData.session_goal_value || ''}
                onChange={(e) => setFormData({ ...formData, session_goal_value: parseInt(e.target.value) })}
                placeholder="Enter target value..."
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Filter by Category</Label>
              <Select
                value={formData.category_filter}
                onValueChange={(value) => setFormData({ ...formData, category_filter: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All categories</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="learning">Learning</SelectItem>
                  <SelectItem value="household">Household</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filter by Difficulty</Label>
              <Select
                value={formData.difficulty_filter}
                onValueChange={(value) => setFormData({ ...formData, difficulty_filter: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.enable_focus_bot}
              onCheckedChange={(checked) => setFormData({ ...formData, enable_focus_bot: checked })}
            />
            <Label>Enable Focus Booster Bot</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.name.trim() || saveMutation.isPending}
            className="bg-gradient-to-r from-purple-500 to-teal-500 text-white"
          >
            {saveMutation.isPending ? 'Saving...' : template ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}