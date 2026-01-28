import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function QuickAddTask({ currentUser }) {
  const queryClient = useQueryClient();
  const [taskTitle, setTaskTitle] = useState("");
  const [duplicateCheck, setDuplicateCheck] = useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingTaskTitle, setPendingTaskTitle] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.Task.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Task created!");
      setTaskTitle("");
      setIsExpanded(false);
    },
  });

  const handleQuickAdd = async () => {
    if (!taskTitle.trim()) return;

    // Simple quick add
    createTaskMutation.mutate({
      title: taskTitle,
      status: "not_started",
      category: "personal",
      priority: "medium"
    });
  };

  const handleSmartAdd = async () => {
    if (!taskTitle.trim()) return;
    setIsGenerating(true);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Break down this task into subtasks: "${taskTitle}". Return JSON with: title (refined title), estimated_minutes (total time), difficulty (easy/medium/hard), subtasks (array of {title, estimated_minutes, order}).`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            estimated_minutes: { type: "number" },
            difficulty: { type: "string" },
            subtasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  estimated_minutes: { type: "number" },
                  order: { type: "number" }
                }
              }
            }
          }
        }
      });

      createTaskMutation.mutate({
        title: result.title || taskTitle,
        status: "not_started",
        category: "personal",
        priority: "medium",
        estimated_minutes: result.estimated_minutes || 30,
        difficulty: result.difficulty || "medium",
        subtasks: result.subtasks || []
      });
    } catch (error) {
      console.error("Error generating subtasks:", error);
      handleQuickAdd();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuickAdd();
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-teal-50 border-purple-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center flex-shrink-0">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <Input
              placeholder="Quick add a task... (Press Enter)"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsExpanded(true)}
              className="border-purple-200 focus:border-purple-400"
            />
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && taskTitle.trim() && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 flex gap-2"
            >
              <Button
                onClick={handleQuickAdd}
                disabled={createTaskMutation.isPending}
                className="flex-1 bg-purple-500 hover:bg-purple-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Quick Add
              </Button>
              <Button
                onClick={handleSmartAdd}
                disabled={isGenerating || createTaskMutation.isPending}
                className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Smart Add
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
      
      <DuplicateTaskChecker
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
        duplicates={duplicateCheck?.duplicates || []}
        newTaskTitle={duplicateCheck?.newTaskTitle || ""}
        onProceed={handleProceedWithDuplicates}
        onCancel={handleCancelDuplicates}
      />
    </Card>
  );
}