import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, CheckCircle, Clock, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import VirtualCompanion from "../components/VirtualCompanion";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function TeamFocusSession() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId');
  
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [task, setTask] = useState(null);
  const [currentSubtaskIndex, setCurrentSubtaskIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [completedSubtasks, setCompletedSubtasks] = useState(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        if (sessionId) {
          const sessions = await base44.entities.CollaborativeFocusSession.filter({ id: sessionId });
          if (sessions.length > 0) {
            const session = sessions[0];
            setSessionData(session);
            
            // Fetch the task
            const tasks = await base44.entities.Task.filter({ id: session.task_id });
            if (tasks.length > 0) {
              setTask(tasks[0]);
              
              // Find first incomplete subtask
              const firstIncomplete = tasks[0].subtasks?.findIndex(st => !st.completed) || 0;
              setCurrentSubtaskIndex(firstIncomplete);
              const firstSubtask = tasks[0].subtasks[firstIncomplete];
              setTimeLeft((firstSubtask?.estimated_minutes || 10) * 60);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [sessionId]);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsActive(false);
            handleSubtaskComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleSubtaskComplete = () => {
    const newCompleted = new Set(completedSubtasks);
    newCompleted.add(currentSubtaskIndex);
    setCompletedSubtasks(newCompleted);

    const updatedSubtasks = task.subtasks.map((st, i) => ({
      ...st,
      completed: newCompleted.has(i)
    }));

    updateTaskMutation.mutate({
      id: task.id,
      data: { subtasks: updatedSubtasks }
    });

    if (currentSubtaskIndex >= task.subtasks.length - 1) {
      toast.success("All steps complete! 🎉");
      updateTaskMutation.mutate({
        id: task.id,
        data: { status: 'completed' }
      });
    } else {
      const nextIndex = currentSubtaskIndex + 1;
      setCurrentSubtaskIndex(nextIndex);
      const nextSubtask = task.subtasks[nextIndex];
      setTimeLeft((nextSubtask?.estimated_minutes || 10) * 60);
      setIsActive(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!sessionData || !task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  const currentSubtask = task.subtasks?.[currentSubtaskIndex];
  const progress = (completedSubtasks.size / task.subtasks.length) * 100;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
            Team Focus Session 🎯
          </h1>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users className="w-5 h-5 text-teal-600" />
            <p className="text-gray-600">{sessionData.participants?.length || 1} team member{sessionData.participants?.length !== 1 ? 's' : ''} working together</p>
          </div>
          <Badge variant="outline" className="text-sm">
            Host: {sessionData.host_name}
          </Badge>
        </motion.div>

        <VirtualCompanion 
          mood={isActive ? "working" : "supportive"}
          message={isActive ? `Working on: ${currentSubtask?.title}` : "Ready to focus together!"}
          size="small"
          showActivity={isActive}
          characterType={currentUser?.companion_type || "robot"}
        />

        <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-600">
                Step {currentSubtaskIndex + 1} of {task.subtasks.length}
              </span>
              <Badge className="bg-gradient-to-r from-purple-500 to-teal-500 text-white">
                {completedSubtasks.size} completed
              </Badge>
            </div>
            <Progress value={progress} className="h-2 mb-2" />
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Current Step:</h3>
              <p className="text-xl font-bold text-gray-900 mb-4">{currentSubtask?.title}</p>
              
              <div className="text-7xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
                {formatTime(timeLeft)}
              </div>
              <p className="text-sm text-gray-500">
                Estimated: {currentSubtask?.estimated_minutes} minutes
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => setIsActive(!isActive)}
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
              >
                {isActive ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                {isActive ? "Pause" : "Resume"}
              </Button>
              <Button 
                onClick={handleSubtaskComplete}
                variant="outline"
                size="lg"
                className="border-green-200 text-green-700 hover:bg-green-50"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Complete Step
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
          <CardHeader>
            <CardTitle className="text-lg">All Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {task.subtasks.map((subtask, index) => {
              const isCompleted = completedSubtasks.has(index);
              const isCurrent = index === currentSubtaskIndex;

              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isCurrent
                      ? 'bg-gradient-to-r from-purple-100 to-teal-100 border-2 border-purple-300'
                      : isCompleted
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <Checkbox
                    checked={isCompleted}
                    disabled
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <span className={isCompleted ? "line-through text-gray-400" : "text-gray-700"}>
                      {subtask.title}
                    </span>
                    {isCurrent && !isCompleted && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Working on this
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {subtask.estimated_minutes}m
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}