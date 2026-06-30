import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, CheckCircle, Clock, Users } from "lucide-react";
import EditableStepList from "@/components/tasks/EditableStepList";
import ExportEasyStepsButton from "@/components/tasks/ExportEasySteps";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import VirtualCompanion from "../components/VirtualCompanion";
import { getPersonalizedMessage } from "../components/companionUtils";
import DuplicateTaskChecker from "../components/tasks/DuplicateTaskChecker";
import { TIER_LIMITS, isWithinLimit, UpgradeModal } from "@/components/subscription/FeatureGate";
// AIEnhancedTextarea, AITaskBreakdownSuggestion, ProactiveCoach, AITimeEstimator hidden (simplification)

export default function TaskBreakdown() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [taskInput, setTaskInput] = useState({
    title: "",
    description: "",
    category: "personal",
    difficulty: "medium",
    energy_level_needed: "medium",
    current_mood: null
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [breakdownResult, setBreakdownResult] = useState(null);
  const [editingSubtasks, setEditingSubtasks] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [duplicateCheck, setDuplicateCheck] = useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingTaskData, setPendingTaskData] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showTaskLimitModal, setShowTaskLimitModal] = useState(false);
  const companionMessage = useMemo(() => getPersonalizedMessage(userProgress, "task_breakdown"), [userProgress?.total_points]);

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
    mutationFn: async (taskData) => {
      // Check active task limit before creating
      const tier = currentUser?.subscription_tier || 'free';
      const activeTasks = await base44.entities.Task.filter({ created_by: currentUser.email });
      const activeCount = activeTasks.filter(t => t.status !== 'completed').length;
      if (!isWithinLimit(tier, 'max_tasks', activeCount)) {
        setShowTaskLimitModal(true);
        throw new Error('TASK_LIMIT_REACHED');
      }
      return base44.entities.Task.create(taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate(createPageUrl("TaskList"));
    },
  });

  const handleBreakdown = async () => {
    if (!taskInput.title.trim()) return;

    setIsProcessing(true);
    try {
      const response = await base44.functions.invoke('taskBreakdownAI', {
        title: taskInput.title,
        description: taskInput.description,
        category: taskInput.category,
        difficulty: taskInput.difficulty,
        energy_level_needed: taskInput.energy_level_needed,
        current_mood: taskInput.current_mood,
        profile_type: currentUser?.profile_type || "adult",
      });

      const result = response.data;

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

  const handleSave = async () => {
    const totalTime = editingSubtasks.reduce((sum, st) => sum + (st.estimated_minutes || 0), 0);
    const taskData = {
      ...taskInput,
      subtasks: editingSubtasks,
      estimated_minutes: totalTime,
      status: "not_started",
      team_id: selectedTeam || undefined
    };

    // Check for duplicates
    const existingTasks = await base44.entities.Task.filter({ 
      created_by: currentUser.email 
    }, '-created_date');
    
    const nonCompletedTasks = existingTasks.filter(t => t.status !== 'completed');
    const duplicates = nonCompletedTasks.filter(existing => {
      const titleSimilarity = existing.title.toLowerCase().includes(taskInput.title.toLowerCase().substring(0, 10)) ||
                              taskInput.title.toLowerCase().includes(existing.title.toLowerCase().substring(0, 10));
      const categorySame = existing.category === taskInput.category;
      return titleSimilarity && categorySame;
    });

    if (duplicates.length > 0) {
      setDuplicateCheck({
        duplicates: duplicates,
        newTaskTitle: taskInput.title
      });
      setPendingTaskData(taskData);
      setShowDuplicateDialog(true);
    } else {
      createTaskMutation.mutate(taskData);
    }
  };

  const handleProceedWithDuplicates = () => {
    if (pendingTaskData) {
      createTaskMutation.mutate(pendingTaskData);
    }
    setShowDuplicateDialog(false);
    setPendingTaskData(null);
    setDuplicateCheck(null);
  };

  const handleCancelDuplicates = () => {
    setShowDuplicateDialog(false);
    setPendingTaskData(null);
    setDuplicateCheck(null);
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
                message={companionMessage}
                size="small"
                characterType={currentUser?.companion_type || "human"}
                userProgress={userProgress}
              />
            </motion.div>

            {/* ProactiveCoach hidden (simplification) */}

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
                  <Label htmlFor="description">Any extra details? (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Add any context that might help break this down..."
                    value={taskInput.description}
                    onChange={(e) => setTaskInput({...taskInput, description: e.target.value})}
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

                <div className="space-y-2">
                  <Label>How are you feeling right now?</Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {['tired', 'anxious', 'overwhelmed', 'unmotivated', 'distracted'].map(mood => (
                      <Button
                        key={mood}
                        type="button"
                        variant={taskInput.current_mood === mood ? "default" : "outline"}
                        onClick={() => setTaskInput({...taskInput, current_mood: mood})}
                        className={taskInput.current_mood === mood ? "bg-gradient-to-r from-purple-500 to-teal-500 text-white" : ""}
                      >
                        {mood}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 This helps us suggest a good first step to help you get started
                  </p>
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

                {/* AITimeEstimator, AITaskBreakdownSuggestion hidden (simplification) */}

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
                  {editingSubtasks?.length > 0 && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <span>🚀</span>
                      <span>Step 1 is your momentum starter — super easy, just to get you moving!</span>
                    </div>
                  )}
                  <EditableStepList
                    steps={editingSubtasks || []}
                    onChange={setEditingSubtasks}
                  />

                  <div className="flex flex-col gap-3 pt-4">
                  <ExportEasyStepsButton
                    taskTitle={taskInput.title}
                    steps={editingSubtasks || []}
                    className="w-full"
                  />
                  <div className="flex gap-3">
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
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        )}

        <UpgradeModal
          open={showTaskLimitModal}
          onOpenChange={setShowTaskLimitModal}
          feature="You've reached your active task limit on the free plan. Upgrade to add more tasks."
          requiredTier="pro"
        />
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