import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Sparkles, Loader2, CheckCircle, Trash2, Clock, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import DuplicateTaskChecker from "../tasks/DuplicateTaskChecker";

export default function QuickAddTask({ currentUser }) {
  const queryClient = useQueryClient();
  const [taskTitle, setTaskTitle] = useState("");
  const [duplicateCheck, setDuplicateCheck] = useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingTaskTitle, setPendingTaskTitle] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [breakdownResult, setBreakdownResult] = useState(null);
  const [editingSubtasks, setEditingSubtasks] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      const allTeams = await base44.entities.Team.list();
      return allTeams.filter(team => 
        team.owner_id === currentUser.id || 
        team.member_ids?.includes(currentUser.id) ||
        team.members?.some(m => m.user_id === currentUser.id)
      );
    },
    enabled: !!currentUser
  });

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

    const existingTasks = await base44.entities.Task.filter({ 
      created_by: currentUser.email 
    }, '-created_date');
    
    const nonCompletedTasks = existingTasks.filter(t => t.status !== 'completed');
    const duplicates = nonCompletedTasks.filter(existing => {
      const titleSimilarity = existing.title.toLowerCase().includes(taskTitle.toLowerCase().substring(0, 10)) ||
                              taskTitle.toLowerCase().includes(existing.title.toLowerCase().substring(0, 10));
      return titleSimilarity;
    });

    if (duplicates.length > 0) {
      setDuplicateCheck({ duplicates, newTaskTitle: taskTitle });
      setPendingTaskTitle(taskTitle);
      setShowDuplicateDialog(true);
      return;
    }

    createTaskMutation.mutate({
      title: taskTitle,
      status: "not_started",
      category: "personal",
      priority: "medium"
    });
  };

  const handleProceedWithDuplicates = () => {
    if (pendingTaskTitle) {
      createTaskMutation.mutate({
        title: pendingTaskTitle,
        status: "not_started",
        category: "personal",
        priority: "medium"
      });
    }
    setShowDuplicateDialog(false);
    setPendingTaskTitle("");
    setDuplicateCheck(null);
  };

  const handleCancelDuplicates = () => {
    setShowDuplicateDialog(false);
    setPendingTaskTitle("");
    setDuplicateCheck(null);
  };

  const handleSmartAdd = async () => {
    if (!taskTitle.trim()) return;
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Break down this task into subtasks: "${taskTitle}". Return JSON with: title (refined title), estimated_minutes (total time), difficulty (easy/medium/hard), category (work/personal/health/creative/learning/household/other), subtasks (array of {title, estimated_minutes, order, completed: false}).`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            estimated_minutes: { type: "number" },
            difficulty: { type: "string" },
            category: { type: "string" },
            encouragement: { type: "string" },
            subtasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  estimated_minutes: { type: "number" },
                  order: { type: "number" },
                  completed: { type: "boolean" }
                }
              }
            }
          }
        }
      });
      setBreakdownResult(result);
      setEditingSubtasks(result.subtasks || []);
    } catch (error) {
      console.error("Error generating subtasks:", error);
      toast.error("Failed to break down task");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveBreakdown = () => {
    const totalTime = editingSubtasks.reduce((sum, st) => sum + (st.estimated_minutes || 0), 0);
    createTaskMutation.mutate({
      title: breakdownResult.title || taskTitle,
      status: "not_started",
      category: breakdownResult.category || "personal",
      priority: "medium",
      estimated_minutes: totalTime,
      difficulty: breakdownResult.difficulty || "medium",
      subtasks: editingSubtasks,
      team_id: selectedTeam || undefined
    });
  };

  const updateSubtask = (index, field, value) => {
    const updated = [...editingSubtasks];
    updated[index] = { ...updated[index], [field]: value };
    setEditingSubtasks(updated);
  };

  const removeSubtask = (index) => {
    setEditingSubtasks(editingSubtasks.filter((_, i) => i !== index));
  };

  const addSubtask = () => {
    setEditingSubtasks([
      ...editingSubtasks,
      { title: "", completed: false, order: editingSubtasks.length + 1, estimated_minutes: 10 }
    ]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuickAdd();
    }
  };

  if (breakdownResult && editingSubtasks) {
    return (
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Review Your Task
            </span>
            <span className="text-sm font-normal text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {editingSubtasks.reduce((sum, st) => sum + (st.estimated_minutes || 0), 0)} min
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Task Title</Label>
            <Input
              value={breakdownResult.title || taskTitle}
              onChange={(e) => setBreakdownResult({...breakdownResult, title: e.target.value})}
              className="text-lg font-medium"
            />
          </div>

          {teams.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Assign to Team (optional)
              </Label>
              <Select value={selectedTeam || ""} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Personal task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Personal task</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Subtasks</Label>
            {editingSubtasks.map((subtask, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <Input
                    value={subtask.title}
                    onChange={(e) => updateSubtask(index, 'title', e.target.value)}
                    className="bg-white dark:bg-gray-700 text-sm"
                    placeholder="Step description"
                  />
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <Input
                      type="number"
                      min="1"
                      value={subtask.estimated_minutes || 10}
                      onChange={(e) => updateSubtask(index, 'estimated_minutes', parseInt(e.target.value))}
                      className="bg-white dark:bg-gray-700 w-16 h-7 text-sm"
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">min</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSubtask(index)}
                  className="h-7 w-7"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={addSubtask}
              size="sm"
              className="w-full border-dashed"
            >
              <Plus className="w-3 h-3 mr-2" />
              Add Step
            </Button>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setBreakdownResult(null);
                setEditingSubtasks(null);
                setSelectedTeam(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveBreakdown}
              disabled={createTaskMutation.isPending}
              className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
            >
              {createTaskMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Task
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 border-purple-200 dark:border-gray-700">
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
              className="mt-3 space-y-2"
            >
              {teams.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Assign to Team (optional)
                  </Label>
                  <Select value={selectedTeam || ""} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Personal task" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Personal task</SelectItem>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2">
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
              </div>
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