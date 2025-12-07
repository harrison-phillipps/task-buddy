import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, CheckCircle, Edit2, Trash2, Plus, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import VirtualCompanion from "../components/VirtualCompanion";
import { getPersonalizedMessage } from "../components/companionUtils";
import AIEnhancedTextarea from "../components/ai/AIEnhancedTextarea";
import { generateTaskDescription } from "../components/ai/AIContentGenerator";

export default function TaskBreakdown() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [taskInput, setTaskInput] = useState({
    title: "",
    description: "",
    category: "personal",
    difficulty: "medium",
    energy_level_needed: "medium"
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [breakdownResult, setBreakdownResult] = useState(null);
  const [editingSubtasks, setEditingSubtasks] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProgress, setUserProgress] = useState(null);

  // Fetch current user and progress
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        const progressList = await base44.entities.UserProgress.filter({ user_id: user.id });
        if (progressList.length > 0) {
          setUserProgress(progressList[0]);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.Task.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate(createPageUrl("TaskList"));
    },
  });

  const handleBreakdown = async () => {
    if (!taskInput.title.trim()) return;

    setIsProcessing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a supportive ADHD coach helping someone break down a task into manageable steps.

Task: ${taskInput.title}
Description: ${taskInput.description || "No additional details"}
Difficulty: ${taskInput.difficulty}
Energy Level Needed: ${taskInput.energy_level_needed}

Break this down into 3-7 clear, actionable subtasks. Each subtask should:
- Be specific and concrete
- Take 5-30 minutes to complete
- Have a clear start and end point
- Be ordered logically
- Use encouraging, supportive language
- Include a realistic time estimate in minutes for how long it will take

Also calculate the total time in minutes for the entire task (sum of all subtask times).`,
        response_json_schema: {
          type: "object",
          properties: {
            subtasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  order: { type: "number" },
                  estimated_minutes: { type: "number" }
                }
              }
            },
            estimated_minutes: { type: "number" },
            encouragement: { type: "string" }
          }
        }
      });

      const subtasksWithCompletion = result.subtasks.map(st => ({
        ...st,
        completed: false
      }));

      setBreakdownResult({
        ...result,
        subtasks: subtasksWithCompletion
      });
      setEditingSubtasks(subtasksWithCompletion);
    } catch (error) {
      console.error("Error breaking down task:", error);
    }
    setIsProcessing(false);
  };

  const handleSave = () => {
    const totalTime = editingSubtasks.reduce((sum, st) => sum + (st.estimated_minutes || 0), 0);
    createTaskMutation.mutate({
      ...taskInput,
      subtasks: editingSubtasks,
      estimated_minutes: totalTime,
      status: "not_started"
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

  const getTotalTime = () => {
    return editingSubtasks?.reduce((sum, st) => sum + (st.estimated_minutes || 0), 0) || 0;
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
            Break Down Your Task ✨
          </h1>
          <p className="text-gray-600">Let's turn that big task into bite-sized pieces!</p>
        </motion.div>

        {!breakdownResult ? (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <VirtualCompanion 
                mood="supportive"
                message={getPersonalizedMessage(userProgress, "task_breakdown")}
                size="small"
                characterType={currentUser?.companion_type || "human"}
                userProgress={userProgress}
              />
            </motion.div>

            <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
              <CardHeader>
                <CardTitle>Task Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">What's the task?</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Clean my room, Write a report, Plan a birthday party..."
                    value={taskInput.title}
                    onChange={(e) => setTaskInput({...taskInput, title: e.target.value})}
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <AIEnhancedTextarea
                    label="Any extra details? (optional)"
                    placeholder="Add any context that might help break this down..."
                    value={taskInput.description}
                    onChange={(value) => setTaskInput({...taskInput, description: value})}
                    onAIGenerate={async () => {
                      if (!taskInput.title) return "";
                      return await generateTaskDescription(taskInput.title, "");
                    }}
                    generateLabel="Generate Description"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={taskInput.category}
                      onValueChange={(value) => setTaskInput({...taskInput, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="work">Work</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="health">Health</SelectItem>
                        <SelectItem value="creative">Creative</SelectItem>
                        <SelectItem value="learning">Learning</SelectItem>
                        <SelectItem value="household">Household</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>How hard does this feel?</Label>
                    <Select
                      value={taskInput.difficulty}
                      onValueChange={(value) => setTaskInput({...taskInput, difficulty: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy peasy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Challenging</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Energy needed</Label>
                    <Select
                      value={taskInput.energy_level_needed}
                      onValueChange={(value) => setTaskInput({...taskInput, energy_level_needed: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleBreakdown}
                  disabled={!taskInput.title.trim() || isProcessing}
                  className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold py-6 text-lg shadow-lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Breaking it down...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Break It Down!
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <VirtualCompanion 
                mood="celebrating"
                message={breakdownResult.encouragement}
                size="small"
                characterType={currentUser?.companion_type || "human"}
                userProgress={userProgress}
              />

              <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      Your Task Breakdown
                    </span>
                    <span className="text-sm font-normal text-gray-600 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Total: {getTotalTime()} minutes
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editingSubtasks?.map((subtask, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-teal-50 rounded-xl"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <Input
                          value={subtask.title}
                          onChange={(e) => updateSubtask(index, 'title', e.target.value)}
                          className="bg-white"
                          placeholder="Step description"
                        />
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <Input
                            type="number"
                            min="1"
                            max="120"
                            value={subtask.estimated_minutes || 10}
                            onChange={(e) => updateSubtask(index, 'estimated_minutes', parseInt(e.target.value))}
                            className="bg-white w-20"
                          />
                          <span className="text-sm text-gray-600">minutes</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSubtask(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </motion.div>
                  ))}

                  <Button
                    variant="outline"
                    onClick={addSubtask}
                    className="w-full border-dashed border-2 border-purple-300"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Step
                  </Button>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBreakdownResult(null);
                        setEditingSubtasks(null);
                      }}
                      className="flex-1"
                    >
                      Start Over
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={createTaskMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold shadow-lg"
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
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}