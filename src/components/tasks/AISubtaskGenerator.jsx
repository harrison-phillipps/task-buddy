import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sparkles, RefreshCw, Edit2, Trash2, Check, Zap, Clock } from "lucide-react";
import { generateSubtasks, refineSubtask } from "../ai/AutoTaskBreakdown";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function AISubtaskGenerator({ 
  taskTitle, 
  taskDescription, 
  taskContext,
  onSubtasksGenerated,
  initialSubtasks = []
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [subtasks, setSubtasks] = useState(initialSubtasks);
  const [encouragement, setEncouragement] = useState("");
  const [tips, setTips] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [isRefining, setIsRefining] = useState(null);

  const handleGenerate = async () => {
    if (!taskTitle || taskTitle.trim().length < 3) {
      toast.error("Please enter a task title first");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateSubtasks(taskTitle, taskDescription, taskContext);
      
      setSubtasks(result.subtasks);
      setEncouragement(result.encouragement);
      setTips(result.tips || []);
      
      toast.success("Subtasks generated! ✨", {
        description: "Review and edit before saving"
      });
      
      if (onSubtasksGenerated) {
        onSubtasksGenerated(result);
      }
    } catch (error) {
      console.error("Error generating subtasks:", error);
      toast.error("Failed to generate subtasks");
    }
    setIsGenerating(false);
  };

  const handleRefine = async (index) => {
    setIsRefining(index);
    try {
      const refined = await refineSubtask(
        subtasks[index], 
        `Task: ${taskTitle}. ${taskDescription || ''}`
      );
      
      const updated = [...subtasks];
      updated[index] = {
        ...updated[index],
        title: refined.refined_title,
        estimated_minutes: refined.suggested_time
      };
      setSubtasks(updated);
      
      toast.success("Subtask refined!", {
        description: refined.tip
      });
    } catch (error) {
      console.error("Error refining:", error);
      toast.error("Failed to refine subtask");
    }
    setIsRefining(null);
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

  const handleAccept = () => {
    if (onSubtasksGenerated) {
      onSubtasksGenerated({ subtasks, encouragement, tips });
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !taskTitle}
        className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600"
      >
        {isGenerating ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Analyzing & Breaking Down...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            AI Break Down Task
          </>
        )}
      </Button>

      <AnimatePresence>
        {subtasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-gradient-to-br from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  AI-Generated Subtasks
                </CardTitle>
                {encouragement && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                    💜 {encouragement}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {subtasks.map((subtask, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-3 rounded-lg border ${
                      subtask.is_warmup 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-2">
                          {subtask.is_warmup && (
                            <Badge className="bg-green-500 text-white text-xs">
                              <Zap className="w-3 h-3 mr-1" />
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
                            <p className="flex-1 text-gray-900 dark:text-gray-100 font-medium">
                              {index + 1}. {subtask.title}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="w-3 h-3" />
                            <Input
                              type="number"
                              value={subtask.estimated_minutes}
                              onChange={(e) => handleTimeChange(index, e.target.value)}
                              className="w-16 h-7 text-xs"
                              min="1"
                            />
                            <span>min</span>
                          </div>
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
                          onClick={() => handleRefine(index)}
                          disabled={isRefining === index}
                          className="h-8 w-8 p-0"
                        >
                          {isRefining === index ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(index)}
                          className="h-8 w-8 p-0 text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {tips.length > 0 && (
                  <div className="mt-4 p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-xs font-semibold text-purple-900 dark:text-purple-300 mb-2">
                      💡 Tips for Success:
                    </p>
                    <ul className="space-y-1">
                      {tips.map((tip, i) => (
                        <li key={i} className="text-xs text-purple-800 dark:text-purple-300">
                          • {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  onClick={handleAccept}
                  className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Accept Subtasks
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}