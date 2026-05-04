import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookTemplate, Plus, Trash2, Play, Save, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";

const ROUTINE_TYPE_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  custom: "Custom",
};

const ROUTINE_TYPE_COLORS = {
  daily: "bg-purple-100 text-purple-700 border-purple-200",
  weekly: "bg-teal-100 text-teal-700 border-teal-200",
  custom: "bg-orange-100 text-orange-700 border-orange-200",
};

function SaveTemplateForm({ tasks, onSaved, onCancel }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [routineType, setRoutineType] = useState("daily");
  const [selectedTaskIds, setSelectedTaskIds] = useState(tasks.filter(t => t.is_recurring).map(t => t.id));

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.RoutineTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineTemplates"] });
      toast.success("Routine template saved!");
      onSaved();
    },
  });

  const toggleTask = (id) => {
    setSelectedTaskIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (!name.trim()) { toast.error("Please enter a template name"); return; }
    if (selectedTaskIds.length === 0) { toast.error("Select at least one task"); return; }

    const selectedTasks = tasks
      .filter(t => selectedTaskIds.includes(t.id))
      .map(({ title, description, category, difficulty, priority, energy_level_needed,
               estimated_minutes, recurrence_pattern, recurrence_interval,
               recurrence_days, recurrence_end_date, subtasks }) => ({
        title, description, category, difficulty, priority, energy_level_needed,
        estimated_minutes, recurrence_pattern, recurrence_interval,
        recurrence_days, recurrence_end_date,
        subtasks: (subtasks || []).map(s => ({ title: s.title, estimated_minutes: s.estimated_minutes, order: s.order })),
      }));

    saveMutation.mutate({ name: name.trim(), description, routine_type: routineType, tasks: selectedTasks });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Template Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Morning Routine" />
      </div>
      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" />
      </div>
      <div className="space-y-2">
        <Label>Routine Type</Label>
        <Select value={routineType} onValueChange={setRoutineType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Select Tasks to Include ({selectedTaskIds.length} selected)</Label>
        <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
          {tasks.filter(t => t.status !== "completed").map(task => (
            <button
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                selectedTaskIds.includes(task.id)
                  ? "bg-purple-100 text-purple-800 border border-purple-300"
                  : "hover:bg-gray-50 border border-transparent"
              }`}
            >
              <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                selectedTaskIds.includes(task.id) ? "bg-purple-600 border-purple-600" : "border-gray-300"
              }`}>
                {selectedTaskIds.includes(task.id) && <span className="text-white text-xs">✓</span>}
              </span>
              <span className="flex-1 truncate">{task.title}</span>
              {task.is_recurring && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200 flex-shrink-0">↻</Badge>
              )}
            </button>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-gradient-to-r from-purple-500 to-teal-500 text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Saving…" : "Save Template"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function TemplateCard({ template, onLoad, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white/80 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{template.name}</span>
            <Badge variant="outline" className={`text-xs ${ROUTINE_TYPE_COLORS[template.routine_type] || ""}`}>
              {ROUTINE_TYPE_LABELS[template.routine_type]}
            </Badge>
          </div>
          {template.description && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{template.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">{template.tasks?.length || 0} tasks</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button size="sm" variant="ghost" onClick={() => setExpanded(e => !e)} className="h-7 w-7 p-0">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(template.id)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" onClick={() => onLoad(template)}
            className="h-7 px-2 bg-gradient-to-r from-purple-500 to-teal-500 text-white text-xs">
            <Play className="w-3 h-3 mr-1" />
            Load
          </Button>
        </div>
      </div>
      {expanded && template.tasks?.length > 0 && (
        <ul className="mt-1 space-y-1 pl-2 border-l-2 border-purple-200">
          {template.tasks.map((t, i) => (
            <li key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
              <span className="text-purple-400">•</span>
              <span>{t.title}</span>
              {t.recurrence_pattern && t.recurrence_pattern !== "none" && (
                <Badge variant="outline" className="text-[10px] py-0 px-1 text-purple-600 border-purple-200">↻ {t.recurrence_pattern}</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function RoutineTemplatesModal({ open, onOpenChange, tasks = [], onLoadTemplate }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("browse"); // "browse" | "save"

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["routineTemplates"],
    queryFn: () => base44.entities.RoutineTemplate.list("-created_date"),
    enabled: open,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RoutineTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineTemplates"] });
      toast.success("Template deleted");
    },
  });

  const handleLoad = (template) => {
    onLoadTemplate(template);
    onOpenChange(false);
    toast.success(`Loading ${template.tasks?.length} tasks from "${template.name}"`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookTemplate className="w-5 h-5 text-purple-600" />
            Routine Templates
          </DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setTab("browse")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === "browse" ? "bg-white shadow text-purple-700" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Browse Templates
          </button>
          <button
            onClick={() => setTab("save")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === "save" ? "bg-white shadow text-purple-700" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Save New Template
          </button>
        </div>

        {tab === "browse" ? (
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Loading templates…</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <div className="text-5xl">📋</div>
                <p className="text-gray-600 font-medium">No templates yet</p>
                <p className="text-sm text-gray-400">Save your current tasks as a routine template to reuse them.</p>
                <Button size="sm" variant="outline" onClick={() => setTab("save")}>
                  <Plus className="w-4 h-4 mr-1" /> Create First Template
                </Button>
              </div>
            ) : (
              templates.map(t => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onLoad={handleLoad}
                  onDelete={(id) => { if (confirm("Delete this template?")) deleteMutation.mutate(id); }}
                />
              ))
            )}
          </div>
        ) : (
          <SaveTemplateForm
            tasks={tasks}
            onSaved={() => setTab("browse")}
            onCancel={() => setTab("browse")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}