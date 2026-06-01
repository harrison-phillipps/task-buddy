import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import MobileSelect from "@/components/MobileSelect";
import {
  Sparkles, RefreshCw, Check, Clock, Loader2, Zap, Battery, BatteryLow,
  BatteryMedium, BatteryFull, Edit2, Trash2, Plus, ChevronDown, ChevronUp, Lock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const ENERGY_ICONS = {
  low: <BatteryLow className="w-3 h-3" />,
  medium: <BatteryMedium className="w-3 h-3" />,
  high: <BatteryFull className="w-3 h-3" />,
};

const ENERGY_COLORS = {
  low: "bg-green-100 text-green-700 border-green-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  high: "bg-red-100 text-red-700 border-red-200",
};

export default function SmartTaskAnalyzer({ open, onOpenChange, onTaskCreated, userTier = "free" }) {
  const [rawText, setRawText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [editingSubtaskIndex, setEditingSubtaskIndex] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showRaw, setShowRaw] = useState(true);
  const navigate = useNavigate();
  const isFree = !userTier || userTier === "free";

  const handleAnalyze = async () => {
    if (!rawText.trim()) return;
    setIsAnalyzing(true);
    setResult(null);

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a productivity expert. Analyze this raw task description and extract a well-structured task plan.

Raw description:
"${rawText}"

Generate:
1. A clear, concise task title
2. A short description (1-2 sentences)
3. The best category (work, personal, health, creative, learning, household, other)
4. Overall difficulty (easy, medium, hard)
5. Overall energy level needed (low, medium, high)
6. Priority (low, medium, high, urgent)
7. 3-8 actionable subtasks with:
   - title (clear action verb)
   - estimated_minutes (realistic, specific number)
   - energy_level (low, medium, high — can vary per subtask)
   - order (1-based)
8. A brief encouragement message
9. 2-3 preparation tips to help the user get ready

Be specific and realistic with time estimates based on the complexity of each step.`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          difficulty: { type: "string" },
          energy_level_needed: { type: "string" },
          priority: { type: "string" },
          subtasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                estimated_minutes: { type: "number" },
                energy_level: { type: "string" },
                order: { type: "number" },
              },
            },
          },
          encouragement: { type: "string" },
          preparation_tips: { type: "array", items: { type: "string" } },
        },
      },
    });

    setResult({
      title: analysis.title || "Untitled Task",
      description: analysis.description || "",
      category: analysis.category || "other",
      difficulty: analysis.difficulty || "medium",
      energy_level_needed: analysis.energy_level_needed || "medium",
      priority: analysis.priority || "medium",
      subtasks: (analysis.subtasks || []).map(st => ({ ...st, completed: false })),
      encouragement: analysis.encouragement || "",
      preparation_tips: analysis.preparation_tips || [],
    });
    setShowRaw(false);
    setIsAnalyzing(false);
  };

  const handleSaveTask = async () => {
    if (!result) return;
    setIsSaving(true);
    const task = await base44.entities.Task.create({
      title: result.title,
      description: result.description,
      category: result.category,
      difficulty: result.difficulty,
      energy_level_needed: result.energy_level_needed,
      priority: result.priority,
      status: "not_started",
      subtasks: result.subtasks,
      estimated_minutes: result.subtasks.reduce((s, st) => s + (st.estimated_minutes || 0), 0),
    });
    toast.success("Task created from your description! 🎉");
    setIsSaving(false);
    onTaskCreated?.(task);
    handleClose();
  };

  const handleClose = () => {
    setRawText("");
    setResult(null);
    setShowRaw(true);
    setEditingSubtaskIndex(null);
    onOpenChange(false);
  };

  const updateSubtask = (index, field, value) => {
    setResult(prev => ({
      ...prev,
      subtasks: prev.subtasks.map((st, i) =>
        i === index ? { ...st, [field]: value } : st
      ),
    }));
  };

  const deleteSubtask = (index) => {
    setResult(prev => ({ ...prev, subtasks: prev.subtasks.filter((_, i) => i !== index) }));
  };

  const addSubtask = () => {
    setResult(prev => ({
      ...prev,
      subtasks: [...prev.subtasks, { title: "New step", estimated_minutes: 10, energy_level: "medium", order: prev.subtasks.length + 1, completed: false }],
    }));
  };

  const totalMinutes = result?.subtasks.reduce((s, st) => s + (st.estimated_minutes || 0), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Smart Task Analyzer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Raw Input */}
          <div>
            <button
              onClick={() => setShowRaw(v => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 hover:text-purple-600 transition-colors"
            >
              {showRaw ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {result ? "Edit description" : "Describe your task"}
            </button>
            {showRaw && (
              <div className="space-y-3">
                <Textarea
                  placeholder="Describe your task in any way — e.g. 'I need to prepare for the quarterly board meeting next week, gather the financial slides, review last quarter's KPIs, and make sure the deck is polished and sent to all stakeholders by Thursday'"
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  className="h-32 resize-none text-sm"
                />
                {isFree ? (
                  <Button
                    onClick={() => { onOpenChange(false); navigate(createPageUrl("Subscription")); }}
                    className="w-full bg-gradient-to-r from-purple-400 to-teal-400 text-white"
                  >
                    <Lock className="w-4 h-4 mr-2" /> Upgrade to Pro to Analyze
                  </Button>
                ) : (
                  <Button
                    onClick={handleAnalyze}
                    disabled={!rawText.trim() || isAnalyzing}
                    className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
                  >
                    {isAnalyzing ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing…</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" /> Analyze & Generate Plan</>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Loading */}
          {isAnalyzing && (
            <div className="text-center py-10">
              <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto mb-3" />
              <p className="text-gray-600 text-sm">Analyzing your description and building a plan…</p>
            </div>
          )}

          {/* Result */}
          <AnimatePresence>
            {result && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {/* Encouragement */}
                {result.encouragement && (
                  <div className="p-3 bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 rounded-lg border border-purple-200 dark:border-purple-700 text-sm text-gray-700 dark:text-gray-300">
                    💜 {result.encouragement}
                  </div>
                )}

                {/* Task Meta */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-500">Title</Label>
                    <Input
                      value={result.title}
                      onChange={e => setResult(prev => ({ ...prev, title: e.target.value }))}
                      className="mt-1 font-semibold"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Description</Label>
                    <Textarea
                      value={result.description}
                      onChange={e => setResult(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1 text-sm h-16 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "Category", field: "category", options: ["work","personal","health","creative","learning","household","other"] },
                      { label: "Difficulty", field: "difficulty", options: ["easy","medium","hard"] },
                      { label: "Energy", field: "energy_level_needed", options: ["low","medium","high"] },
                      { label: "Priority", field: "priority", options: ["low","medium","high","urgent"] },
                    ].map(({ label, field, options }) => (
                      <div key={field}>
                        <Label className="text-xs text-gray-500">{label}</Label>
                        <MobileSelect
                          value={result[field]}
                          onValueChange={v => setResult(prev => ({ ...prev, [field]: v }))}
                          placeholder={label}
                          options={options.map(o => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))}
                          className="mt-1 h-8 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subtasks */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Subtasks</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {totalMinutes} min total
                      </Badge>
                      <Button size="sm" variant="outline" onClick={handleAnalyze} className="h-7 text-xs px-2">
                        <RefreshCw className="w-3 h-3 mr-1" /> Regen
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {result.subtasks.map((st, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <span className="text-xs font-bold text-gray-400 mt-0.5 w-4 shrink-0">{i + 1}</span>
                        <div className="flex-1 space-y-1.5">
                          {editingSubtaskIndex === i ? (
                            <div className="flex gap-2">
                              <Input
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="flex-1 h-7 text-xs"
                                autoFocus
                                onBlur={() => {
                                  updateSubtask(i, "title", editValue);
                                  setEditingSubtaskIndex(null);
                                }}
                                onKeyDown={e => {
                                  if (e.key === "Enter") {
                                    updateSubtask(i, "title", editValue);
                                    setEditingSubtaskIndex(null);
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <p
                              className="text-sm text-gray-800 dark:text-gray-200 cursor-pointer hover:text-purple-600"
                              onClick={() => { setEditingSubtaskIndex(i); setEditValue(st.title); }}
                            >
                              {st.title}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <Input
                              type="number"
                              value={st.estimated_minutes}
                              onChange={e => updateSubtask(i, "estimated_minutes", parseInt(e.target.value) || 5)}
                              className="w-16 h-6 text-xs px-1"
                              min="1"
                            />
                            <span className="text-xs text-gray-400">min</span>
                            <Badge
                              className={`text-[10px] px-1.5 py-0 h-5 border ${ENERGY_COLORS[st.energy_level] || ENERGY_COLORS.medium}`}
                            >
                              {ENERGY_ICONS[st.energy_level] || ENERGY_ICONS.medium}
                              <span className="ml-1 capitalize">{st.energy_level || "medium"}</span>
                            </Badge>
                            <MobileSelect
                              value={st.energy_level || "medium"}
                              onValueChange={v => updateSubtask(i, "energy_level", v)}
                              placeholder="Energy"
                              options={[
                                { value: "low", label: "Low" },
                                { value: "medium", label: "Medium" },
                                { value: "high", label: "High" },
                              ]}
                              className="w-20 h-6 text-[10px] px-1"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => deleteSubtask(i)}
                          className="text-gray-300 hover:text-red-500 transition-colors mt-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addSubtask}
                    className="mt-2 w-full text-xs h-8 border-dashed"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Step
                  </Button>
                </div>

                {/* Preparation Tips */}
                {result.preparation_tips?.length > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1.5">🚀 Preparation Tips</p>
                    <ul className="space-y-1">
                      {result.preparation_tips.map((tip, i) => (
                        <li key={i} className="text-xs text-blue-700 dark:text-blue-400">• {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
                  <Button
                    onClick={handleSaveTask}
                    disabled={isSaving}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
                  >
                    {isSaving ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
                    ) : (
                      <><Check className="w-4 h-4 mr-2" /> Create Task</>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}