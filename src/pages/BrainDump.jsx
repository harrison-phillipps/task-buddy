import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, CheckCircle, Brain, Trash2, Clock, Layers, Mic, Repeat, Users } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import VirtualCompanion from "../components/VirtualCompanion";
import { Badge } from "@/components/ui/badge";
import { POINTS_SYSTEM } from "@/components/achievementsData";
import { getPersonalizedMessage } from "@/components/companionUtils";
import VoiceToText from "../components/VoiceToText";
import DuplicateTaskChecker from "../components/tasks/DuplicateTaskChecker";
import VoiceSchedulePrompt from "../components/braindump/VoiceSchedulePrompt";
import NativeMicButton from "../components/braindump/NativeMicButton";

export default function BrainDump() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [brainDumpText, setBrainDumpText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [groupBy, setGroupBy] = useState("none");
  const [showHistory, setShowHistory] = useState(false);
  const [userProgress, setUserProgress] = useState(null);
  const [duplicateCheck, setDuplicateCheck] = useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingTasks, setPendingTasks] = useState(null);
  const [companionMessage, setCompanionMessage] = useState("");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [showSchedulePrompt, setShowSchedulePrompt] = useState(false);

  const { data: brainDumps = [] } = useQuery({
    queryKey: ['brainDumps', currentUser?.email],
    queryFn: () => currentUser ? base44.entities.BrainDump.filter({ created_by: currentUser.email }, '-created_date', 10) : [],
    enabled: !!currentUser,
  });

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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        // Fetch user progress for personalized messages
        const progressList = await base44.entities.UserProgress.filter({ user_id: user.id });
        if (progressList.length > 0) {
          setUserProgress(progressList[0]);
          // Set initial companion message
          setCompanionMessage(getPersonalizedMessage(progressList[0], "brain_dump"));
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // Update companion message every 30 seconds
  useEffect(() => {
    if (!userProgress) return;
    
    const interval = setInterval(() => {
      setCompanionMessage(getPersonalizedMessage(userProgress, "brain_dump"));
    }, 30000);

    return () => clearInterval(interval);
  }, [userProgress]);

  const createTasksMutation = useMutation({
    mutationFn: async ({ tasks, brainDumpId }) => {
      const createdTasks = await Promise.all(
        tasks.map(task => base44.entities.Task.create(task))
      );
      
      const taskIds = createdTasks.map(t => t.id);
      await base44.entities.BrainDump.update(brainDumpId, {
        task_ids: taskIds,
        tasks_created: taskIds.length
      });
      
      return createdTasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['brainDumps'] });
      navigate(createPageUrl("Tasks"));
    },
  });

  const handleProcess = async () => {
    if (!brainDumpText.trim()) return;

    setIsProcessing(true);
    try {
      // Run LLM + save brain dump + update points all in parallel
      const [result, savedBrainDump] = await Promise.all([
        base44.integrations.Core.InvokeLLM({
          prompt: `You are a productivity assistant. Today's date is ${new Date().toISOString().split('T')[0]}. Extract ALL tasks from this brain dump into structured data.

Brain Dump:
${brainDumpText}

Rules:
- Extract EVERY item (if 10 items listed → 10 tasks)
- For each task: clear title, category (work/personal/health/creative/learning/household/other), difficulty (easy/medium/hard), energy_level_needed (low/medium/high), task_priority (must_do/should_do/could_do), 3-5 subtasks with time estimates, is_recurring + pattern if applicable
- Infer due_date from time references ("tomorrow", "next week", "Friday" → ISO date YYYY-MM-DD). If no date mentioned, omit due_date.
- Keep subtask titles concise
- estimated_minutes = sum of subtask times
- encouragement: one short upbeat sentence`,
          response_json_schema: {
            type: "object",
            properties: {
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    category: { type: "string" },
                    difficulty: { type: "string" },
                    energy_level_needed: { type: "string" },
                    task_priority: { type: "string", enum: ["must_do", "should_do", "could_do"] },
                    due_date: { type: "string" },
                    estimated_minutes: { type: "number" },
                    is_recurring: { type: "boolean" },
                    recurrence_pattern: { type: "string", enum: ["none", "daily", "weekly", "biweekly", "monthly"] },
                    recurrence_reason: { type: "string" },
                    subtasks: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          order: { type: "number" },
                          estimated_minutes: { type: "number" },
                          completed: { type: "boolean" }
                        }
                      }
                    }
                  }
                }
              },
              encouragement: { type: "string" },
              recurring_detected: { type: "number" }
            }
          }
        }),
        base44.entities.BrainDump.create({
          content: brainDumpText,
          tasks_created: 0,
          team_id: selectedTeam || undefined
        })
      ]);

      setExtractedTasks({ ...result, brainDumpId: savedBrainDump.id });

      if (result.recurring_detected > 0) {
        toast.success(`Detected ${result.recurring_detected} recurring pattern(s)! 🔄`);
      }
    } catch (error) {
      console.error("Error processing brain dump:", error);
      toast.error("Something went wrong, please try again.");
    }
    setIsProcessing(false);
  };

  const handleNativeMicDone = (transcript) => {
    if (!transcript.trim()) return;
    setBrainDumpText(prev => prev ? prev + "\n" + transcript : transcript);
    toast.success("Voice captured! Review and tap 'Organize Into Tasks'.");
  };

  const handleVoiceDictationEnd = async () => {
    setIsVoiceActive(false);
    if (!brainDumpText.trim()) return;

    // Auto-process the brain dump after dictation ends
    setIsProcessing(true);
    try {
      const [result, savedBrainDump] = await Promise.all([
        base44.integrations.Core.InvokeLLM({
          prompt: `You are a productivity assistant. Today's date is ${new Date().toISOString().split('T')[0]}. Extract ALL tasks from this brain dump into structured data.

Brain Dump:
${brainDumpText}

Rules:
- Extract EVERY item (if 10 items listed → 10 tasks)
- For each task: clear title, category (work/personal/health/creative/learning/household/other), difficulty (easy/medium/hard), energy_level_needed (low/medium/high), task_priority (must_do/should_do/could_do), 3-5 subtasks with time estimates, is_recurring + pattern if applicable
- Infer due_date from time references ("tomorrow", "next week", "Friday" → ISO date YYYY-MM-DD). If no date mentioned, omit due_date.
- Keep subtask titles concise
- estimated_minutes = sum of subtask times
- encouragement: one short upbeat sentence`,
          response_json_schema: {
            type: "object",
            properties: {
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    category: { type: "string" },
                    difficulty: { type: "string" },
                    energy_level_needed: { type: "string" },
                    task_priority: { type: "string", enum: ["must_do", "should_do", "could_do"] },
                    estimated_minutes: { type: "number" },
                    is_recurring: { type: "boolean" },
                    recurrence_pattern: { type: "string", enum: ["none", "daily", "weekly", "biweekly", "monthly"] },
                    recurrence_reason: { type: "string" },
                    subtasks: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          order: { type: "number" },
                          estimated_minutes: { type: "number" },
                          completed: { type: "boolean" }
                        }
                      }
                    }
                  }
                }
              },
              encouragement: { type: "string" },
              recurring_detected: { type: "number" }
            }
          }
        }),
        base44.entities.BrainDump.create({
          content: brainDumpText,
          tasks_created: 0,
          team_id: selectedTeam || undefined
        })
      ]);

      Promise.all([
        base44.entities.BrainDump.update(savedBrainDump.id, { encouragement: result.encouragement }),
        (async () => {
          try {
            const progressList = await base44.entities.UserProgress.filter({ user_id: currentUser.id });
            if (progressList.length > 0) {
              const up = progressList[0];
              await base44.entities.UserProgress.update(up.id, {
                total_points: up.total_points + POINTS_SYSTEM.BRAIN_DUMP_CREATED,
                brain_dumps_created: (up.brain_dumps_created || 0) + 1
              });
            }
          } catch (e) { console.error("Error updating progress:", e); }
        })()
      ]);

      setExtractedTasks({ ...result, brainDumpId: savedBrainDump.id });
      setShowSchedulePrompt(true); // Show the schedule prompt after voice dictation
    } catch (error) {
      console.error("Error processing brain dump:", error);
      toast.error("Something went wrong, please try again.");
    }
    setIsProcessing(false);
  };

  const handleScheduleTask = async (task) => {
    setShowSchedulePrompt(false);
    // Save all tasks first, then navigate to focus session
    const tasksToCreate = extractedTasks.tasks.map(t => ({
      ...t,
      status: "not_started",
      is_recurring: t.is_recurring || false,
      recurrence_pattern: t.recurrence_pattern || "none",
      task_priority: t.task_priority || null,
      team_id: selectedTeam || undefined
    }));

    try {
      const createdTasks = await Promise.all(tasksToCreate.map(t => base44.entities.Task.create(t)));
      await base44.entities.BrainDump.update(extractedTasks.brainDumpId, {
        task_ids: createdTasks.map(t => t.id),
        tasks_created: createdTasks.length
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['brainDumps'] });

      // Find the saved version of the selected task
      const savedTask = createdTasks.find(t => t.title === task.title) || createdTasks[0];
      navigate(createPageUrl(`FocusSession?taskId=${savedTask.id}`));
    } catch (error) {
      console.error("Error saving tasks before focus session:", error);
      toast.error("Failed to save tasks. Please try again.");
    }
  };

  const handleSaveAll = async () => {
    const tasksToCreate = extractedTasks.tasks.map(task => ({
      ...task,
      status: "not_started",
      is_recurring: task.is_recurring || false,
      recurrence_pattern: task.recurrence_pattern || "none",
      task_priority: task.task_priority || null,
      team_id: selectedTeam || undefined
    }));

    // Check for duplicates in non-completed tasks
    const existingTasks = await base44.entities.Task.filter({ 
      created_by: currentUser.email 
    }, '-created_date');
    
    const nonCompletedTasks = existingTasks.filter(t => t.status !== 'completed');
    const duplicates = [];

    tasksToCreate.forEach(newTask => {
      const similar = nonCompletedTasks.filter(existing => {
        const titleSimilarity = existing.title.toLowerCase().includes(newTask.title.toLowerCase().substring(0, 10)) ||
                                newTask.title.toLowerCase().includes(existing.title.toLowerCase().substring(0, 10));
        const categorySame = existing.category === newTask.category;
        return titleSimilarity && categorySame;
      });
      duplicates.push(...similar);
    });

    if (duplicates.length > 0) {
      setDuplicateCheck({
        duplicates: Array.from(new Set(duplicates.map(d => d.id))).map(id => duplicates.find(d => d.id === id)),
        newTaskTitle: `${tasksToCreate.length} new task${tasksToCreate.length > 1 ? 's' : ''} from brain dump`
      });
      setPendingTasks({ tasks: tasksToCreate, brainDumpId: extractedTasks.brainDumpId });
      setShowDuplicateDialog(true);
    } else {
      createTasksMutation.mutate({
        tasks: tasksToCreate,
        brainDumpId: extractedTasks.brainDumpId
      });
    }
  };

  const handleProceedWithDuplicates = () => {
    if (pendingTasks) {
      createTasksMutation.mutate(pendingTasks);
    }
    setShowDuplicateDialog(false);
    setPendingTasks(null);
    setDuplicateCheck(null);
  };

  const handleCancelDuplicates = () => {
    setShowDuplicateDialog(false);
    setPendingTasks(null);
    setDuplicateCheck(null);
  };

  const loadBrainDump = (brainDump) => {
    setBrainDumpText(brainDump.content);
    setExtractedTasks(null);
    setShowHistory(false);
  };

  const removeTask = (index) => {
    const updated = { ...extractedTasks };
    updated.tasks = updated.tasks.filter((_, i) => i !== index);
    setExtractedTasks(updated);
  };

  const getTotalTime = () => {
    return extractedTasks?.tasks.reduce((sum, task) => sum + (task.estimated_minutes || 0), 0) || 0;
  };

  const getTotalTasks = () => {
    return extractedTasks?.tasks.length || 0;
  };

  const getGroupedTasks = () => {
    if (!extractedTasks?.tasks || groupBy === "none") {
      return { "All Tasks": extractedTasks?.tasks || [] };
    }

    const grouped = {};
    
    extractedTasks.tasks.forEach(task => {
      let key;
      if (groupBy === "category") {
        key = task.category || "other";
      } else if (groupBy === "energy") {
        key = task.energy_level_needed || "medium";
      } else if (groupBy === "difficulty") {
        key = task.difficulty || "medium";
      } else if (groupBy === "priority") {
        key = task.task_priority || "should_do";
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(task);
    });

    return grouped;
  };

  const getGroupIcon = (groupName) => {
    const categoryEmojis = {
      work: "💼",
      personal: "🏠",
      health: "💪",
      creative: "🎨",
      learning: "📚",
      household: "🧹",
      other: "📌"
    };

    const energyEmojis = {
      low: "🟢",
      medium: "🟡",
      high: "🔴"
    };

    const difficultyEmojis = {
      easy: "⭐",
      medium: "⭐⭐",
      hard: "⭐⭐⭐"
    };

    const priorityEmojis = {
      must_do: "🔴",
      should_do: "🟡",
      could_do: "🟢"
    };

    if (groupBy === "category") return categoryEmojis[groupName] || "📌";
    if (groupBy === "energy") return energyEmojis[groupName] || "🟡";
    if (groupBy === "difficulty") return difficultyEmojis[groupName] || "⭐⭐";
    if (groupBy === "priority") return priorityEmojis[groupName] || "🟡";
    return "📋";
  };

  const getGroupLabel = (key) => {
    return key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ');
  };

  const groupedTasks = getGroupedTasks();

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
            Brain Dump 🧠
          </h1>
          <p className="text-gray-600">Dump everything on your mind. I'll help you organize it!</p>
        </motion.div>

        {!extractedTasks ? (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <VirtualCompanion 
                mood="supportive"
                message={companionMessage}
                size="small"
                characterType={currentUser?.companion_type || "human"}
                userProgress={userProgress}
              />
            </motion.div>

            {brainDumps.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-gray-800">
                      Recent Brain Dumps
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowHistory(!showHistory)}
                      className="text-purple-600 hover:bg-purple-50"
                    >
                      {showHistory ? "Hide" : "Show"} History
                    </Button>
                  </div>
                </CardHeader>
                <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                      {brainDumps.map((dump) => (
                        <motion.div
                          key={dump.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-3 bg-gradient-to-r from-purple-50 to-teal-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => loadBrainDump(dump)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700 line-clamp-2 mb-1">
                                {dump.content}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{new Date(dump.created_date).toLocaleDateString()}</span>
                                {dump.tasks_created > 0 && (
                                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                                    {dump.tasks_created} tasks
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </CardContent>
                  </motion.div>
                )}
                </AnimatePresence>
              </Card>
            )}

            <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  What's on your mind?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Prominent native mic */}
                <div className="flex flex-col items-center py-4 bg-gradient-to-br from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 rounded-2xl border border-purple-100 dark:border-purple-800">
                  <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-4">🎙️ Speak your thoughts</p>
                  <NativeMicButton
                    onTranscript={(text) => setBrainDumpText(prev => prev + text + " ")}
                    onDone={handleNativeMicDone}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                  <span className="text-xs text-gray-400 font-medium">or type below</span>
                  <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="braindump">Write freely - no structure needed!</Label>
                    <VoiceToText
                      onTranscript={(text) => { setBrainDumpText(prev => prev + text); setIsVoiceActive(true); }}
                      onDictationEnd={handleVoiceDictationEnd}
                    />
                  </div>
                  <div className="relative">
                    <Textarea
                      id="braindump"
                      placeholder="Example:&#10;- Need to clean my room by Friday&#10;- Email boss about deadline tomorrow&#10;- Call mom next week&#10;&#10;Or use the mic above!"
                      value={brainDumpText}
                      onChange={(e) => setBrainDumpText(e.target.value)}
                      className={`min-h-[200px] text-base resize-none transition-all ${isVoiceActive ? 'border-red-400 ring-2 ring-red-100' : ''}`}
                    />
                    {isVoiceActive && (
                      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-3 py-1 text-xs text-red-600 font-medium">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        Live transcription
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    💡 Mention dates like "tomorrow" or "next Friday" — the AI will set due dates automatically.
                  </p>
                </div>

                {teams.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Create Tasks for Team (optional)
                    </Label>
                    <Select value={selectedTeam || ""} onValueChange={(val) => setSelectedTeam(val || null)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Personal tasks" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Personal tasks</SelectItem>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>
                            👥 {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      {selectedTeam 
                        ? `Tasks will be created for ${teams.find(t => t.id === selectedTeam)?.name}`
                        : "Tasks will be created as personal tasks"
                      }
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleProcess}
                  disabled={!brainDumpText.trim() || isProcessing}
                  className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold py-6 text-lg shadow-lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Organizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Organize Into Tasks
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
                                message={extractedTasks.encouragement}
                                size="small"
                                characterType={currentUser?.companion_type || "human"}
                                userProgress={userProgress}
                              />

              <VoiceSchedulePrompt
                tasks={extractedTasks.tasks}
                visible={showSchedulePrompt}
                onSchedule={handleScheduleTask}
                onDismiss={() => setShowSchedulePrompt(false)}
              />

              <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      Your Organized Tasks
                    </CardTitle>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-gray-500" />
                        <Select value={groupBy} onValueChange={setGroupBy}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Group by" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No grouping</SelectItem>
                            <SelectItem value="priority">By Priority (MoSCoW)</SelectItem>
                            <SelectItem value="category">By Category</SelectItem>
                            <SelectItem value="energy">By Energy Level</SelectItem>
                            <SelectItem value="difficulty">By Difficulty</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-4 text-sm font-normal">
                        <span className="text-gray-600">{getTotalTasks()} tasks</span>
                        <span className="text-gray-600 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {getTotalTime()}m
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {Object.entries(groupedTasks).map(([groupName, tasks]) => (
                    <div key={groupName} className="space-y-4">
                      {groupBy !== "none" && (
                        <div className="flex items-center gap-2 pb-2 border-b border-purple-100">
                          <span className="text-2xl">{getGroupIcon(groupName)}</span>
                          <h3 className="text-lg font-bold text-gray-900">
                            {getGroupLabel(groupName)}
                          </h3>
                          <Badge variant="outline" className="ml-auto">
                            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      )}

                      {tasks.map((task, index) => {
                        const originalIndex = extractedTasks.tasks.indexOf(task);
                        
                        return (
                          <motion.div
                            key={originalIndex}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 bg-gradient-to-r from-purple-50 to-teal-50 rounded-xl border border-purple-100"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{task.title}</h3>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {groupBy !== "category" && (
                                    <Badge className="bg-purple-100 text-purple-700">
                                      {task.category}
                                    </Badge>
                                  )}
                                  {groupBy !== "difficulty" && (
                                    <Badge variant="outline">{task.difficulty}</Badge>
                                  )}
                                  {groupBy !== "energy" && (
                                    <Badge variant="outline">{task.energy_level_needed} energy</Badge>
                                  )}
                                  {groupBy !== "priority" && task.task_priority && (
                                    <Badge className={
                                      task.task_priority === 'must_do' ? 'bg-red-100 text-red-700' :
                                      task.task_priority === 'should_do' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-green-100 text-green-700'
                                    }>
                                      {task.task_priority === 'must_do' ? '🔴 Must Do' :
                                       task.task_priority === 'should_do' ? '🟡 Should Do' :
                                       '🟢 Could Do'}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {task.estimated_minutes}m
                                  </Badge>
                                  {task.is_recurring && (
                                    <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
                                      <Repeat className="w-3 h-3" />
                                      {task.recurrence_pattern}
                                    </Badge>
                                  )}
                                </div>
                                {task.description && (
                                  <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                                )}
                                {task.is_recurring && task.recurrence_reason && (
                                  <p className="text-xs text-orange-700 bg-orange-50 p-2 rounded mb-3 italic">
                                    🔄 {task.recurrence_reason}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeTask(originalIndex)}
                                className="text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="space-y-2">
                              <p className="text-xs font-medium text-gray-700 uppercase">Steps:</p>
                              {task.subtasks?.map((subtask, subIndex) => (
                                <div key={subIndex} className="flex items-center gap-3 text-sm">
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold text-purple-600">
                                    {subIndex + 1}
                                  </span>
                                  <span className="flex-1 text-gray-700">{subtask.title}</span>
                                  <span className="text-xs text-gray-500">{subtask.estimated_minutes}m</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ))}

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setExtractedTasks(null);
                        setBrainDumpText("");
                        setGroupBy("none");
                      }}
                      className="flex-1"
                    >
                      Start Over
                    </Button>
                    <Button
                      onClick={handleSaveAll}
                      disabled={createTasksMutation.isPending || getTotalTasks() === 0}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold shadow-lg"
                    >
                      {createTasksMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Save All ({getTotalTasks()})
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        )}

        <DuplicateTaskChecker
          open={showDuplicateDialog}
          onOpenChange={setShowDuplicateDialog}
          duplicates={duplicateCheck?.duplicates || []}
          newTaskTitle={duplicateCheck?.newTaskTitle || ""}
          onProceed={handleProceedWithDuplicates}
          onCancel={handleCancelDuplicates}
        />
      </div>
    </div>
  );
}