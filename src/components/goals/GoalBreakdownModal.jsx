import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, CheckCircle, Trash2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import VirtualCompanion from "../VirtualCompanion";

export default function GoalBreakdownModal({ goal, open, onClose, onSuccess }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState(null);

  const createTasksMutation = useMutation({
    mutationFn: async (tasks) => {
      for (const task of tasks) {
        await base44.entities.Task.create({
          ...task,
          goal_id: goal.id,
          status: "not_started"
        });
      }
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const keyResultsContext = goal.key_results?.length > 0 
        ? "\n\nKey Results to achieve:\n" + goal.key_results.map(kr => `- ${kr.title}: ${kr.current_value}/${kr.target_value} ${kr.unit}`).join('\n')
        : "";

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a productivity expert. Break down this goal into 4-8 actionable tasks:

Goal: ${goal.title}
${goal.description ? `Description: ${goal.description}` : ''}
Type: ${goal.type}
Target Date: ${goal.target_date || 'Not specified'}${keyResultsContext}

Create concrete, specific tasks that will help achieve this goal. For each task:
1. Clear, actionable title
2. Brief description
3. Appropriate category (work, personal, health, creative, learning, household, other)
4. Difficulty level (easy, medium, hard)
5. Priority (low, medium, high, urgent)
6. Energy level needed (low, medium, high)
7. Realistic time estimate in minutes (30-240)
8. Due date that aligns with the goal's target
9. 3-5 subtasks with time estimates (5-30 min each)

Make tasks feel achievable and well-structured.`,
        response_json_schema: {
          type: "object",
          properties: {
            encouragement: { type: "string" },
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  difficulty: { type: "string" },
                  priority: { type: "string" },
                  energy_level_needed: { type: "string" },
                  estimated_minutes: { type: "number" },
                  due_date: { type: "string" },
                  subtasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        estimated_minutes: { type: "number" },
                        completed: { type: "boolean" },
                        order: { type: "number" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      setGeneratedTasks(result);
    } catch (error) {
      console.error("Error generating tasks:", error);
      alert("Failed to generate tasks. Please try again.");
    }
    setIsGenerating(false);
  };

  const handleRemoveTask = (index) => {
    setGeneratedTasks({
      ...generatedTasks,
      tasks: generatedTasks.tasks.filter((_, i) => i !== index)
    });
  };

  const handleSaveAll = () => {
    createTasksMutation.mutate(generatedTasks.tasks);
  };

  const categoryColors = {
    work: "bg-blue-100 text-blue-700",
    personal: "bg-purple-100 text-purple-700",
    health: "bg-green-100 text-green-700",
    creative: "bg-pink-100 text-pink-700",
    learning: "bg-yellow-100 text-yellow-700",
    household: "bg-teal-100 text-teal-700",
    other: "bg-gray-100 text-gray-700"
  };

  if (!goal) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Goal Breakdown: {goal.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {!generatedTasks ? (
            <>
              <VirtualCompanion
                mood="supportive"
                message="Let me help you break this goal into actionable tasks! I'll analyze your objective and create a smart action plan. 🎯"
                size="small"
              />

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold py-6"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    AI is analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Action Plan
                  </>
                )}
              </Button>
            </>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <VirtualCompanion
                  mood="celebrating"
                  message={generatedTasks.encouragement}
                  size="small"
                />

                <div className="space-y-3">
                  {generatedTasks.tasks.map((task, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="bg-white border-purple-100">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 text-white flex items-center justify-center font-bold text-xs">
                                  {index + 1}
                                </span>
                                <h4 className="font-semibold text-gray-900">{task.title}</h4>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                              <div className="flex flex-wrap gap-2 mb-2">
                                <Badge className={categoryColors[task.category]}>
                                  {task.category}
                                </Badge>
                                <Badge variant="outline">{task.difficulty}</Badge>
                                <Badge variant="outline">{task.priority} priority</Badge>
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {task.estimated_minutes}m
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500">
                                {task.subtasks.length} subtasks • Due: {new Date(task.due_date).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveTask(index)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveAll}
                    disabled={createTasksMutation.isPending || generatedTasks.tasks.length === 0}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 text-white font-semibold"
                  >
                    {createTasksMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Create {generatedTasks.tasks.length} Tasks
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}