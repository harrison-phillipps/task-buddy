import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, CheckCircle, ArrowRight, AlertCircle, Trash2, Edit2, Link as LinkIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import VirtualCompanion from "../components/VirtualCompanion";
import { getPersonalizedMessage } from "@/components/companionUtils";

export default function AITaskGenerator() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const teamIdParam = urlParams.get('teamId');
  
  const [goalDescription, setGoalDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [companionMessage, setCompanionMessage] = useState("");
  const [teamId, setTeamId] = useState(teamIdParam || null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        const progressList = await base44.entities.UserProgress.filter({ user_id: user.id });
        if (progressList.length > 0) {
          setUserProgress(progressList[0]);
          setCompanionMessage(getPersonalizedMessage(progressList[0], "task_breakdown", user));
        } else {
          setCompanionMessage(getPersonalizedMessage(null, "task_breakdown", user));
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const createTasksMutation = useMutation({
    mutationFn: async (tasks) => {
      // Create tasks in order, tracking IDs for dependencies
      const taskIdMap = {};
      
      for (const task of tasks) {
        const taskData = {
          title: task.title,
          description: task.description,
          category: task.category,
          difficulty: task.difficulty,
          priority: task.priority,
          energy_level_needed: task.energy_level_needed,
          estimated_minutes: task.estimated_minutes,
          due_date: task.due_date,
          subtasks: task.subtasks,
          blocked_by: [],
          status: "not_started",
          team_id: teamId
        };

        // Map dependency references to actual IDs
        if (task.depends_on && task.depends_on.length > 0) {
          taskData.blocked_by = task.depends_on
            .map(dep => taskIdMap[dep])
            .filter(Boolean);
        }

        const createdTask = await base44.entities.Task.create(taskData);
        taskIdMap[task.temp_id] = createdTask.id;
      }
      
      return Object.keys(taskIdMap).length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (teamId) {
        navigate(createPageUrl(`TeamDashboard?teamId=${teamId}`));
      } else {
        navigate(createPageUrl("Tasks"));
      }
    },
  });

  const handleGenerate = async () => {
    if (!goalDescription.trim()) return;

    setIsGenerating(true);
    setCompanionMessage("Analyzing your goal and creating a smart action plan... This is going to be great! 🎯");
    setCompanionMood("working");
    
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert project manager and productivity coach. A user wants to achieve the following goal:

"${goalDescription}"

Break this down into 3-7 concrete, actionable tasks. For each task:
1. Create a clear, specific title
2. Write a brief description
3. Determine the category (work, personal, health, creative, learning, household, or other)
4. Assess difficulty (easy, medium, or hard)
5. Set priority (low, medium, high, or urgent)
6. Determine energy level needed (low, medium, or high)
7. Estimate total time in minutes (be realistic, 30-240 minutes)
8. Create 3-6 actionable subtasks with estimated minutes (5-30 min each)
9. Identify dependencies: which tasks must be completed before others? Use temp_id to reference other tasks
10. Suggest a realistic due date (within the next 7-30 days from today: ${new Date().toISOString().split('T')[0]})

Be encouraging and practical. Make tasks feel achievable. Consider natural task order and dependencies.`,
        response_json_schema: {
          type: "object",
          properties: {
            project_summary: { type: "string" },
            encouragement: { type: "string" },
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  temp_id: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  difficulty: { type: "string" },
                  priority: { type: "string" },
                  energy_level_needed: { type: "string" },
                  estimated_minutes: { type: "number" },
                  due_date: { type: "string" },
                  depends_on: {
                    type: "array",
                    items: { type: "string" }
                  },
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
      setCompanionMood("celebrating");
      
      // Provide personalized coaching after generation
      const taskCount = result.tasks.length;
      const hasDependencies = result.tasks.some(t => t.depends_on?.length > 0);
      
      let message = "Perfect! I've mapped out " + taskCount + " tasks for you. ";
      if (hasDependencies) {
        message += "I noticed some tasks depend on others - smart sequencing! ";
      }
      message += "Review them and let's make it happen! 🚀";
      
      setCompanionMessage(message);
    } catch (error) {
      console.error("Error generating tasks:", error);
      setCompanionMessage("Oops! Something went wrong. But don't worry - take a breath and try again. You've got this! 💪");
      setCompanionMood("supportive");
      alert("Failed to generate tasks. Please try again.");
    }
    setIsGenerating(false);
  };

  const handleRemoveTask = (tempId) => {
    setGeneratedTasks({
      ...generatedTasks,
      tasks: generatedTasks.tasks.filter(t => t.temp_id !== tempId)
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

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
            AI Task Generator ✨
          </h1>
          <p className="text-gray-600">Describe your goal and I'll break it down into actionable tasks</p>
        </motion.div>

        {!generatedTasks ? (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <VirtualCompanion 
                mood={companionMood}
                message={companionMessage}
                size="small"
                characterType={currentUser?.companion_type || "human"}
                userProgress={userProgress}
              />
            </motion.div>

            <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Describe Your Goal or Project
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="goal">What do you want to accomplish?</Label>
                  <Textarea
                    id="goal"
                    placeholder="Example:&#10;&#10;I want to launch a personal blog about cooking. I need to choose a platform, design it, write my first 5 posts, and promote it on social media. I've never done this before and I'm a bit overwhelmed."
                    value={goalDescription}
                    onChange={(e) => setGoalDescription(e.target.value)}
                    className="min-h-[200px] text-base resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    💡 Tip: Be specific! Include timeline, context, and any concerns you have.
                  </p>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={!goalDescription.trim() || isGenerating}
                  className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold py-6 text-lg shadow-lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      AI is thinking...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Action Plan
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
                mood={companionMood}
                message={companionMessage}
                size="small"
                characterType={currentUser?.companion_type || "human"}
                userProgress={userProgress}
              />

              <Card className="bg-gradient-to-br from-purple-50 to-teal-50 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    Your Action Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{generatedTasks.project_summary}</p>
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>{generatedTasks.tasks.length} tasks generated with dependencies mapped</span>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {generatedTasks.tasks.map((task, index) => {
                  const hasDependencies = task.depends_on && task.depends_on.length > 0;
                  const dependencyTasks = hasDependencies 
                    ? task.depends_on.map(id => generatedTasks.tasks.find(t => t.temp_id === id))
                    : [];

                  return (
                    <motion.div
                      key={task.temp_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 text-white flex items-center justify-center font-bold text-sm">
                                  {index + 1}
                                </span>
                                <CardTitle className="text-lg">{task.title}</CardTitle>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge className={categoryColors[task.category]}>
                                  {task.category}
                                </Badge>
                                <Badge variant="outline">{task.difficulty}</Badge>
                                <Badge variant="outline">{task.priority} priority</Badge>
                                <Badge variant="outline">{task.estimated_minutes}m</Badge>
                                {task.due_date && (
                                  <Badge variant="outline">Due: {new Date(task.due_date).toLocaleDateString()}</Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveTask(task.temp_id)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {task.description && (
                            <p className="text-sm text-gray-600">{task.description}</p>
                          )}

                          {hasDependencies && (
                            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <LinkIcon className="w-4 h-4 text-orange-600" />
                                <span className="text-sm font-medium text-orange-900">Requires:</span>
                              </div>
                              {dependencyTasks.map(dep => (
                                <p key={dep.temp_id} className="text-sm text-orange-700 ml-6">
                                  • {dep.title}
                                </p>
                              ))}
                            </div>
                          )}

                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-700 uppercase">Subtasks:</p>
                            {task.subtasks.map((subtask, subIndex) => (
                              <div key={subIndex} className="flex items-center gap-3 text-sm">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600">
                                  {subIndex + 1}
                                </span>
                                <span className="flex-1 text-gray-700">{subtask.title}</span>
                                <span className="text-xs text-gray-500">{subtask.estimated_minutes}m</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedTasks(null);
                    setGoalDescription("");
                  }}
                  className="flex-1"
                >
                  Start Over
                </Button>
                <Button
                  onClick={handleSaveAll}
                  disabled={createTasksMutation.isPending || generatedTasks.tasks.length === 0}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold shadow-lg"
                >
                  {createTasksMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Create All Tasks ({generatedTasks.tasks.length})
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}