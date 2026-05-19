import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Edit2, Trash2, Check, Clock, Loader2, BatteryLow, DatabaseZap } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

const CACHE_PREFIX = "ai_breakdown_";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCached(taskId) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + taskId);
    if (!raw) return null;
    const { data, cachedAt } = JSON.parse(raw);
    if (Date.now() - cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + taskId);
      return null;
    }
    return data;
  } catch { return null; }
}

function setCache(taskId, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + taskId, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch {}
}

export default function AIBreakdownModal({ task, open, onOpenChange, onSave, lowAIMode = false }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [subtasks, setSubtasks] = useState([]);
  const [encouragement, setEncouragement] = useState("");
  const [tips, setTips] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [fromCache, setFromCache] = useState(false);

  React.useEffect(() => {
    if (open && task && subtasks.length === 0 && !lowAIMode) {
      const cached = getCached(task.id);
      if (cached) {
        setSubtasks(cached.subtasks || []);
        setEncouragement(cached.encouragement || "");
        setTips(cached.tips || []);
        setFromCache(true);
      } else {
        handleGenerate();
      }
    }
    if (!open) {
      setFromCache(false);
    }
  }, [open, task, lowAIMode]);

  const handleGenerate = async (force = false) => {
    if (!task) return;

    if (!force) {
      const cached = getCached(task.id);
      if (cached) {
        setSubtasks(cached.subtasks || []);
        setEncouragement(cached.encouragement || "");
        setTips(cached.tips || []);
        setFromCache(true);
        return;
      }
    }

    setIsGenerating(true);
    setFromCache(false);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Break this task into 4–7 specific, actionable subtasks with time estimates. Add a warm-up step if difficult.

Task: ${task.title}
${task.description ? `Description: ${task.description}` : ""}
Category: ${task.category} | Difficulty: ${task.difficulty}

Return JSON with: subtasks (array of {title, estimated_minutes, order, is_warmup: boolean, completed: false}), encouragement (string, 1 sentence), tips (array of 2-3 strings)`,
        response_json_schema: {
          type: "object",
          properties: {
            subtasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  estimated_minutes: { type: "number" },
                  order: { type: "number" },
                  is_warmup: { type: "boolean" },
                  completed: { type: "boolean" }
                }
              }
            },
            encouragement: { type: "string" },
            tips: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      const data = {
        subtasks: result.subtasks || [],
        encouragement: result.encouragement || "",
        tips: result.tips || [],
      };
      setCache(task.id, data);
      setSubtasks(data.subtasks);
      setEncouragement(data.encouragement);
      setTips(data.tips);

      toast.success("AI breakdown complete! ✨");
    } catch (error) {
      console.error("Error generating breakdown:", error);
      toast.error("Failed to generate breakdown");
    }
    setIsGenerating(false);
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditValue(subtasks[index].title);
  };

  const handleSaveEdit = (index) => {
    const updated = [...subtasks];
    updated[index].title = editValue;
    setSubtasks(updated);
    setEditingIndex(null);
    setEditValue("");
  };

  const handleDelete = (index) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleTimeChange = (index, minutes) => {
    const updated = [...subtasks];
    updated[index].estimated_minutes = parseInt(minutes) || 5;
    setSubtasks(updated);
  };

  const handleSave = () => {
    const totalTime = subtasks.reduce((sum, st) => sum + (st.estimated_minutes || 0), 0);
    onSave({
      subtasks,
      estimated_minutes: totalTime
    });
    setSubtasks([]);
    setEncouragement("");
    setTips([]);
  };

  const handleClose = () => {
    setSubtasks([]);
    setEncouragement("");
    setTips([]);
    setFromCache(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Task Breakdown
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {lowAIMode ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700 p-4 text-sm text-yellow-800 dark:text-yellow-300 flex gap-3">
              <BatteryLow className="w-5 h-5 flex-shrink-0 mt-0.5 text-yellow-600" />
              <div>
                <p className="font-semibold mb-1">Low-AI Mode is on for this category</p>
                <p className="text-xs">AI breakdown is disabled for <strong>{task?.category}</strong> tasks to save integration credits. You can add subtasks manually from the task edit page, or turn this off in <strong>Settings → AI Priority</strong>.</p>
              </div>
            </div>
          ) : isGenerating ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Analyzing task and creating breakdown...</p>
            </div>
          ) : subtasks.length > 0 ? (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {encouragement && (
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-teal-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-gray-800">
                      💜 {encouragement}
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Subtasks</h3>
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                      <Clock className="w-3 h-3 mr-1" />
                      {subtasks.reduce((sum, st) => sum + (st.estimated_minutes || 0), 0)} min total
                    </Badge>
                  </div>

                  {subtasks.map((subtask, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-3 rounded-lg border ${
                        subtask.is_warmup
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start gap-2">
                            {subtask.is_warmup && (
                              <Badge className="bg-green-500 text-white text-xs">
                                Warm-up
                              </Badge>
                            )}
                            {editingIndex === index ? (
                              <div className="flex-1 flex gap-2">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="flex-1"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveEdit(index)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <p className="flex-1 text-gray-900 font-medium">
                                {index + 1}. {subtask.title}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <Input
                              type="number"
                              value={subtask.estimated_minutes}
                              onChange={(e) => handleTimeChange(index, e.target.value)}
                              className="w-20 h-7 text-xs"
                              min="1"
                            />
                            <span className="text-xs text-gray-600">min</span>
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(index)}
                            className="h-8 w-8 p-0 text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {tips.length > 0 && (
                  <div className="p-3 bg-purple-100 rounded-lg border border-purple-200">
                    <p className="text-xs font-semibold text-purple-900 mb-2">
                      💡 Tips for Success:
                    </p>
                    <ul className="space-y-1">
                      {tips.map((tip, i) => (
                        <li key={i} className="text-xs text-purple-800">
                          • {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-4">
                  {fromCache && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 justify-center">
                      <DatabaseZap className="w-3.5 h-3.5 text-teal-500" />
                      Loaded from cache · <button className="underline hover:text-purple-600" onClick={() => handleGenerate(true)}>Regenerate fresh</button>
                    </div>
                  )}
                  <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleGenerate(true)}
                    disabled={isGenerating}
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Apply Subtasks
                  </Button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No subtasks generated yet</p>
              <Button
                onClick={handleGenerate}
                className="mt-4"
              >
                Generate Breakdown
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}