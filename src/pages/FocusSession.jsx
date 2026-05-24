import React, { useState, useEffect, useRef, useCallback } from "react";
// base44 client
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBackgroundTimer, requestNotificationPermission, showNotification, scheduleEncouragementNotification } from "../components/focus/BackgroundTimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw, CheckCircle, Coffee, ChevronRight, Clock, Timer, Target, Heart } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import VirtualCompanion from "../components/VirtualCompanion";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import AchievementNotification from "../components/AchievementNotification";
import { POINTS_SYSTEM, checkNewAchievements, calculateLevel } from "@/components/achievementsData";
import { getPersonalizedMessage } from "@/components/companionUtils";
import SessionGoals from "../components/focus/SessionGoals";
import AmbientSoundPlayer from "../components/focus/AmbientSoundPlayer";
import PostSessionSummary from "../components/focus/PostSessionSummary";
import FocusBoosterBot from "../components/ai/FocusBoosterBot";
import FocusSessionTemplates from "../components/focus/FocusSessionTemplates";
import SessionHistoryAnalyzer from "../components/focus/SessionHistoryAnalyzer";
import DynamicTemplateGenerator from "../components/focus/DynamicTemplateGenerator";
import RealTimeAICoach from "../components/focus/RealTimeAICoach";
import AdvancedControls from "../components/focus/AdvancedControls";
import MindfulnessBreak from "../components/focus/MindfulnessBreak";
import PersonalizedJourneyAnalyzer from "../components/focus/PersonalizedJourneyAnalyzer";
import JourneyRecommendations from "../components/focus/JourneyRecommendations";
import MoodCoach from "../components/focus/MoodCoach";
import PostSessionMoodReflection from "../components/focus/PostSessionMoodReflection";
import AdaptiveBreakSuggestion from "../components/focus/AdaptiveBreakSuggestion";
import GuidedBreakFlow from "../components/focus/GuidedBreakFlow";
import SmartTimerRecommendations from "../components/focus/SmartTimerRecommendations";
import CalendarFocusBlocker from "../components/focus/CalendarFocusBlocker";
import SessionCoach from "../components/ai/SessionCoach";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { enqueueOp, upsertCachedEntity, cacheEntities, getCachedEntities } from "../components/offlineStore";
import { useOfflineSync } from "../components/useOfflineSync";
import { useActiveSessionSync } from "../hooks/useActiveSessionSync";
import OfflineIndicator from "../components/OfflineIndicator";
import PomodoroTimer from "../components/focus/PomodoroTimer";
import DistractionBlocker from "../components/focus/DistractionBlocker";
import SessionMetrics from "../components/focus/SessionMetrics";
import SpotifyPlayer from "../components/focus/SpotifyPlayer";
import { hasFeatureAccess, UpgradePrompt } from "../components/subscription/FeatureGate";
import FocusCompanionChat from "../components/focus/FocusCompanionChat";
import VoiceCommandListener from "../components/focus/VoiceCommandListener";
import { useVoiceAnnouncements } from "../hooks/useVoiceAnnouncements";
import FocusNotificationSettings, {
  showRichNotification,
  registerServiceWorker,
  scheduleNotificationAt,
  cancelAllNotifications,
  getNotifPrefs,
  sendSWMessage,
  startSWKeepAlive,
  stopSWKeepAlive,
} from "../components/focus/FocusNotificationSettings";

// Dynamic encouragement based on user progress
const getEncouragementMessages = (userProgress) => {
  const base = [
    "You're doing amazing! Keep it up! 💪",
    "I'm proud of you for staying focused! ✨",
    "Look at you go! You've got this! 🌟",
    "Great progress! We're in this together! 🤝",
    "You're crushing it! Keep going! 🔥",
  ];

  const level = userProgress?.level || 1;
  const sessions = userProgress?.focus_sessions_completed || 0;

  if (level >= 10) {
    base.push(
      "A Level " + level + " focus master at work! 🏆",
      "Your focus powers are legendary! ⚡"
    );
  }

  if (sessions >= 25) {
    base.push(
      "Session #" + (sessions + 1) + "! You've built an amazing habit! 🧘",
      "The Focus Master is in the zone! 🎯"
    );
  }

  if (userProgress?.current_streak >= 5) {
    base.push(
      userProgress.current_streak + " day streak! Unstoppable! 🔥",
      "Your consistency is incredible! 💪"
    );
  }

  return base;
};



export default function FocusSession() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedTaskId = urlParams.get('taskId');
  const preselectedTaskTitle = urlParams.get('taskTitle') ? decodeURIComponent(urlParams.get('taskTitle')) : null;

  const quickStart = urlParams.get('quickStart') === '1' || urlParams.get('autostart') === 'true';
  const preselectedMood = urlParams.get('mood') || null;
  const preselectedTechnique = urlParams.get('technique') || null;

  const [selectedTaskId, setSelectedTaskId] = useState(preselectedTaskId || null);
  const [currentSubtaskIndex, setCurrentSubtaskIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  // Default mood to "neutral" for quick-start so session can begin without manual mood selection
  const [moodBefore, setMoodBefore] = useState(preselectedMood || (quickStart ? "neutral" : null));
  const [completedSubtasks, setCompletedSubtasks] = useState(new Set());
  const [sessionNotes, setSessionNotes] = useState("");
  const [showBreakPrompt, setShowBreakPrompt] = useState(false);
  const [currentEncouragement, setCurrentEncouragement] = useState("");
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [allStepsComplete, setAllStepsComplete] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [focusTechnique, setFocusTechnique] = useState(preselectedTechnique || "standard");
  const [workInterval, setWorkInterval] = useState(25);
  const [breakInterval, setBreakInterval] = useState(5);
  const [ambientSound, setAmbientSound] = useState("none");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const [isBreakTime, setIsBreakTime] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [newAchievements, setNewAchievements] = useState([]);
  const [showAchievement, setShowAchievement] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  
  // Session Goals
  const [sessionGoalType, setSessionGoalType] = useState(null);
  const [sessionGoalValue, setSessionGoalValue] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [showPostSummary, setShowPostSummary] = useState(false);
  const [sessionSummaryData, setSessionSummaryData] = useState(null);
  const [showFocusBot, setShowFocusBot] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [pauseCount, setPauseCount] = useState(0);
  const [dynamicBreakSuggestion, setDynamicBreakSuggestion] = useState(null);
  const [includeMindfulness, setIncludeMindfulness] = useState(false);
  const [mindfulnessType, setMindfulnessType] = useState("breathing");
  const [showMindfulness, setShowMindfulness] = useState(false);
  const [preSessionRitual, setPreSessionRitual] = useState(null);
  const [showMoodReflection, setShowMoodReflection] = useState(false);
  const [adaptiveBreakConfig, setAdaptiveBreakConfig] = useState(null);
  const [showGuidedBreak, setShowGuidedBreak] = useState(false);
  const [isController, setIsController] = useState(false);
  
  const [voiceAnnouncementsEnabled, setVoiceAnnouncementsEnabled] = useState(false);
  const { checkMilestone, announcePhase, reset: resetVoice } = useVoiceAnnouncements(voiceAnnouncementsEnabled);

  const audioRef = useRef(null);
  const encouragementTimers = useRef([]);

  const { isOnline, pendingCount, isSyncing, flushQueue, refreshPendingCount } = useOfflineSync({
    onSyncComplete: () => {
      queryClient.invalidateQueries({ queryKey: ['focusSessionTasks'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  // Check notification permission + register SW on mount
  useEffect(() => {
    registerServiceWorker();
    requestNotificationPermission().then(granted => {
      setNotificationsEnabled(granted);
    });
  }, []);

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['focusSessionTasks', currentUser?.id],
    queryFn: async () => {
      const user = currentUser || await base44.auth.me();
      if (!user) return [];

      if (!navigator.onLine) {
        const cached = await getCachedEntities('Task');
        return cached.filter(task => {
          if (!task.team_id && task.created_by === user.email) return true;
          if (task.team_id && (
            task.assigned_to === user.id ||
            task.assigned_to_users?.some(u => u.user_id === user.id)
          )) return true;
          return false;
        });
      }

      const allTasks = await base44.entities.Task.list('-created_date');
      await cacheEntities('Task', allTasks);
      return allTasks.filter(task => {
        if (!task.team_id && task.created_by === user.email) return true;
        if (task.team_id && (
          task.assigned_to === user.id || 
          task.assigned_to_users?.some(u => u.user_id === user.id)
        )) return true;
        return false;
      });
    },
    enabled: true,
    staleTime: isOnline ? 0 : Infinity,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', currentUser?.email],
    queryFn: () => currentUser ? base44.entities.FocusSession.filter({ created_by: currentUser.email }, '-created_date', 20) : [],
    enabled: !!currentUser,
  });

  const { data: journeyData = [] } = useQuery({
    queryKey: ['focusJourney', currentUser?.id],
    queryFn: () => currentUser ? base44.entities.FocusJourney.filter({ user_id: currentUser.id }, '-created_date', 30) : [],
    enabled: !!currentUser,
  });

  // Keep a stable reference to the task once the session starts, so refetches don't lose it
  const [lockedTask, setLockedTask] = useState(null);
  const selectedTask = sessionStarted ? (lockedTask || tasks.find(t => t.id === selectedTaskId)) : tasks.find(t => t.id === selectedTaskId);
  const currentSubtask = selectedTask?.subtasks?.[currentSubtaskIndex];

  // Real-time cross-device session sync (must be after selectedTask is defined)
  const onRemoteState = useCallback((remote) => {
    setSelectedTaskId(remote.taskId);
    setIsActive(remote.isActive);
    setIsBreakTime(remote.isBreakTime);
    setTimeLeft(remote.timeLeft);
    setCurrentSubtaskIndex(remote.currentSubtaskIndex);
    setFocusTechnique(remote.focusTechnique);
    setWorkInterval(remote.workInterval);
    setBreakInterval(remote.breakInterval);
    setPomodorosCompleted(remote.pomodorosCompleted);
    setSessionStarted(true);
  }, []);

  const { clearSession: clearSyncSession } = useActiveSessionSync({
    currentUser,
    isController,
    enabled: sessionStarted,
    sessionState: {
      taskId: selectedTaskId,
      taskTitle: selectedTask?.title,
      isActive,
      isBreakTime,
      timeLeft,
      currentSubtaskIndex,
      focusTechnique,
      workInterval,
      breakInterval,
      pomodorosCompleted,
    },
    onRemoteState,
  });

  // Track which ending-soon alerts have already fired for the current interval
  const endingSoonFiredRef = useRef(new Set());

  // Reset fired alerts when a new timer interval starts (task changes, break starts, etc.)
  useEffect(() => {
    endingSoonFiredRef.current = new Set();
  }, [currentSubtaskIndex, isBreakTime, sessionStarted]);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (isActive && sessionStarted && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          const next = prev - 1;
          checkMilestone(next, isBreakTime ? "break" : "focus");

          // Ending-soon alerts: 5 min, 2 min, 1 min
          if (!isBreakTime && notificationsEnabled && getNotifPrefs().sessionEndingSoon !== false) {
            const thresholds = [300, 120, 60]; // seconds
            for (const t of thresholds) {
              if (next === t && !endingSoonFiredRef.current.has(t)) {
                endingSoonFiredRef.current.add(t);
                const mins = Math.floor(t / 60);
                const label = mins === 1 ? "1 minute" : `${mins} minutes`;
                const msg = `${label} remaining — keep it up!`;
                showRichNotification(`⏰ ${label} left`, msg, {
                  tag: `ending-soon-${t}`,
                  requireInteraction: false,
                  vibrate: [100, 50, 100],
                });
                // Voice announcement
                if (voiceAnnouncementsEnabled && 'speechSynthesis' in window) {
                  const utt = new SpeechSynthesisUtterance(`${label} remaining`);
                  utt.volume = 0.8;
                  utt.rate = 0.95;
                  window.speechSynthesis.speak(utt);
                }
              }
            }
          }

          if (next <= 0) {
            setIsActive(false);
            if (focusTechnique === "pomodoro") {
              handlePomodoroComplete();
            } else {
              handleSubtaskComplete();
            }
            return 0;
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, sessionStarted, timeLeft, checkMilestone, isBreakTime, notificationsEnabled, voiceAnnouncementsEnabled]);

  // Auto-start session when quickStart param is present and task is loaded
  const quickStartFiredRef = useRef(false);
  const startSessionRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        // Fetch user progress for personalized messages
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

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      if (!navigator.onLine) {
        await enqueueOp({ entity: 'Task', type: 'update', id, data });
        await upsertCachedEntity('Task', id, { ...tasks.find(t => t.id === id), ...data, id });
        await refreshPendingCount();
        return { id, ...data };
      }
      const updated = await base44.entities.Task.update(id, data);
      await upsertCachedEntity('Task', id, updated);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['focusSessionTasks'] });
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (sessionData) => {
      if (!navigator.onLine) {
        const tempId = `local_${Date.now()}`;
        await enqueueOp({ entity: 'FocusSession', type: 'create', id: tempId, data: sessionData });
        await upsertCachedEntity('FocusSession', tempId, { ...sessionData, id: tempId });
        await refreshPendingCount();
        return { ...sessionData, id: tempId };
      }
      return base44.entities.FocusSession.create(sessionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });



  useEffect(() => {
    if (!isActive || !sessionStarted || isBreakTime) {
      // Clear all encouragement timers
      encouragementTimers.current.forEach(timer => clearTimeout(timer));
      encouragementTimers.current = [];
      return;
    }

    const encouragementMessages = getEncouragementMessages(userProgress);

    // Schedule encouragements
    const timer1 = setTimeout(() => {
      const randomMessage = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
      setCurrentEncouragement(randomMessage);
      setShowEncouragement(true);
      
      if (document.hidden && notificationsEnabled && getNotifPrefs().encouragements !== false) {
        showRichNotification('Keep Going! 💪', randomMessage, { tag: 'encouragement' });
      }
      
      setTimeout(() => setShowEncouragement(false), 5000);
    }, 120000); // 2 minutes

    const timer2 = setInterval(() => {
      const randomMessage = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
      setCurrentEncouragement(randomMessage);
      setShowEncouragement(true);
      
      if (document.hidden && notificationsEnabled && getNotifPrefs().encouragements !== false) {
        showRichNotification('Keep Going! 💪', randomMessage, { tag: 'encouragement' });
      }
      
      setTimeout(() => setShowEncouragement(false), 5000);
    }, 180000); // 3 minutes

    encouragementTimers.current = [timer1, timer2];

    return () => {
      encouragementTimers.current.forEach(timer => clearTimeout(timer));
      encouragementTimers.current = [];
    };
  }, [isActive, sessionStarted, isBreakTime, userProgress, notificationsEnabled]);

  useEffect(() => {
    if (soundEnabled && ambientSound !== "none" && isActive && !isBreakTime) {
      console.log(`Playing ${ambientSound} sound`);
    }
  }, [soundEnabled, ambientSound, isActive, isBreakTime]);

  useEffect(() => {
    if (newAchievements.length > 0 && !showAchievement) {
      const timeout = setTimeout(() => {
        const currentIndex = newAchievements.findIndex(a => a.id === showAchievement?.id);
        if (currentIndex < newAchievements.length - 1) {
          setShowAchievement(newAchievements[currentIndex + 1]);
        } else {
          setShowAchievement(null);
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [showAchievement, newAchievements]);

  const handlePomodoroComplete = () => {
    if (!isBreakTime) {
      setPomodorosCompleted(prev => prev + 1);
      
      // Show mindfulness break if enabled
      if (includeMindfulness && pomodorosCompleted % 2 === 1) {
        setShowMindfulness(true);
      } else {
        setIsBreakTime(true);
        setTimeLeft(breakInterval * 60);
        setShowBreakPrompt(true);
        announcePhase(`Pomodoro complete! Break time. ${breakInterval} minutes.`);
        if (notificationsEnabled && getNotifPrefs().breakReminder !== false) {
          showRichNotification('Break Time! ☕', `${breakInterval} min break — stretch, hydrate, breathe.`, {
            tag: 'break-start',
            requireInteraction: false,
          });
        }
      }
      
      if (notificationsEnabled && getNotifPrefs().pomodoroComplete !== false) {
        showRichNotification('Pomodoro Complete! 🍅', 'Time for a break! Great work.', {
          tag: 'pomodoro',
          requireInteraction: true,
          actions: [{ action: 'start_break', title: '☕ Start Break' }, { action: 'skip_break', title: '⏩ Skip Break' }]
        });
      }
    } else {
      setIsBreakTime(false);
      setShowBreakPrompt(false);
      announcePhase("Break over. Back to focus!");
      // Schedule next Pomodoro-complete notification
      if (notificationsEnabled && getNotifPrefs().pomodoroComplete !== false) {
        sendSWMessage({
          type: 'SCHEDULE_POMODORO_COMPLETE',
          completesAt: Date.now() + workInterval * 60 * 1000,
          body: `Pomodoro #${pomodorosCompleted + 1} done! Time for a ${breakInterval}m break.`,
        });
      }
      handleSubtaskComplete();
    }
  };

  const handleSubtaskComplete = (forceComplete = false) => {
    const newCompleted = new Set(completedSubtasks);
    newCompleted.add(currentSubtaskIndex);
    setCompletedSubtasks(newCompleted);

    const subtasks = selectedTask?.subtasks || [];
    const updatedSubtasks = subtasks.map((st, i) => ({
      ...st,
      completed: newCompleted.has(i)
    }));

    if (updatedSubtasks.length > 0) {
      updateTaskMutation.mutate({
        id: selectedTask.id,
        data: { subtasks: updatedSubtasks }
      });
    }

    if (subtasks.length === 0 || currentSubtaskIndex >= subtasks.length - 1) {
      setAllStepsComplete(true);
      setShowBreakPrompt(true);

      if (notificationsEnabled && getNotifPrefs().sessionEnd !== false) {
        showRichNotification('All Steps Complete! 🎉', 'Amazing work! Session finished.', {
          tag: 'session-end',
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 400],
        });
      }
    } else {
      const nextIndex = currentSubtaskIndex + 1;
      setCurrentSubtaskIndex(nextIndex);
      const nextSubtask = (selectedTask?.subtasks || [])[nextIndex];

      const nextTime = focusTechnique === "pomodoro" 
        ? workInterval * 60 
        : (nextSubtask?.estimated_minutes || 10) * 60;

      setTimeLeft(nextTime);
      setIsActive(false);
    }
  };

  const handleCompleteEarly = () => {
    setIsActive(false);
    if (focusTechnique === "pomodoro" && !isBreakTime) {
      handlePomodoroComplete();
    } else {
      handleSubtaskComplete(true);
    }
  };

  const handleNeedMoreTime = () => {
    const additionalTime = focusTechnique === "pomodoro" ? 5 * 60 : (currentSubtask?.estimated_minutes || 5) * 60 * 0.5;
    setTimeLeft(prev => prev + additionalTime);
    toast.success(`Added ${Math.floor(additionalTime / 60)} more minutes!`);
  };

  const handleApplyTemplate = async (template) => {
    setSelectedTemplate(template);
    setFocusTechnique(template.focus_technique);
    setWorkInterval(template.work_interval);
    setBreakInterval(template.break_interval);
    setAmbientSound(template.ambient_sound);
    setShowFocusBot(template.enable_focus_bot !== false);
    if (template.session_goal_type && template.session_goal_type !== 'none') {
      setSessionGoalType(template.session_goal_type);
      setSessionGoalValue(template.session_goal_value);
    }
    
    if (template.pre_session_ritual) {
      toast(`Pre-session ritual: ${template.pre_session_ritual}`, { duration: 8000, icon: '🧘' });
    }
    
    if (template.break_activities?.length > 0) {
      setDynamicBreakSuggestion(template.break_activities[0]);
    }

    // Update usage count for saved templates
    if (template.id && !template.is_dynamic) {
      try {
        await base44.entities.FocusSessionTemplate.update(template.id, {
          usage_count: (template.usage_count || 0) + 1
        });
        queryClient.invalidateQueries({ queryKey: ['focusTemplates'] });
      } catch (error) {
        console.error("Error updating template usage:", error);
      }
    }
  };

  const handleAISuggestion = (suggestion) => {
    if (suggestion.type === "sound") {
      setAmbientSound(suggestion.value);
      setSoundEnabled(true);
    } else if (suggestion.type === "break") {
      setDynamicBreakSuggestion(suggestion.value);
      toast(`Break suggestion: ${suggestion.value}`, { duration: 5000 });
    }
  };

  const handleAdvancedSettings = (settings) => {
    if (focusTechnique === "pomodoro") {
      setWorkInterval(settings.sessionLength);
      setBreakInterval(settings.breakDuration);
    }
    setIncludeMindfulness(settings.includeMindfulness || false);
    setMindfulnessType(settings.mindfulnessType || "breathing");
    toast.success("Applied advanced settings!");
  };

  const handleTaskAdjustment = async (suggestion) => {
    toast(suggestion, { duration: 8000 });
  };

  const startSession = () => {
    if (!selectedTaskId || !moodBefore) return;

    // Lock the task data so refetches don't cause a blank screen mid-session
    const taskToLock = tasks.find(t => t.id === selectedTaskId);
    if (!taskToLock) {
      toast.error("Task not found. Please re-select your task.");
      return;
    }

    // Set all state synchronously in one batch to avoid race condition
    // where sessionStarted=true but lockedTask is still null
    const newSessionId = `session_${Date.now()}`;
    setLockedTask(taskToLock);
    setSessionId(newSessionId);
    setIsController(true);

    const subtasks = taskToLock.subtasks || [];
    const firstIncomplete = subtasks.findIndex(st => !st.completed);
    const firstIdx = firstIncomplete === -1 ? 0 : firstIncomplete;
    const firstSubtask = subtasks[firstIdx];
    const initialTime = focusTechnique === "pomodoro"
      ? workInterval * 60
      : (firstSubtask?.estimated_minutes || 10) * 60;

    setCurrentSubtaskIndex(firstIdx);
    setTimeLeft(initialTime);
    setSessionStartTime(Date.now());
    setIsActive(true);
    setSessionStarted(true); // set LAST so lockedTask is ready when render triggers
    startSWKeepAlive(); // Prevent SW termination during active session

    // Schedule a SW-based session-end notification at the exact timestamp
    const prefs = getNotifPrefs();
    const totalMs = taskToLock.subtasks?.reduce((s, st) => s + (st.estimated_minutes || 0) * 60000, 0) || initialTime * 1000;
    const sessionEndsAt = Date.now() + totalMs;

    // Schedule SW-based session-end notification
    if (notificationsEnabled && prefs.sessionEnd !== false) {
      sendSWMessage({
        type: 'SCHEDULE_SESSION_END',
        endsAt: sessionEndsAt,
        title: '⏱ Session Complete!',
        body: `You finished: ${taskToLock.title}`,
        taskId: taskToLock.id,
      });
    }

    // Schedule SW-based ending-soon notifications (5 min, 2 min, 1 min before end)
    if (notificationsEnabled && prefs.sessionEndingSoon !== false) {
      const warningThresholds = [
        { seconds: 300, label: "5 minutes" },
        { seconds: 120, label: "2 minutes" },
        { seconds: 60,  label: "1 minute" },
      ];
      for (const { seconds, label } of warningThresholds) {
        const alertAt = sessionEndsAt - seconds * 1000;
        if (alertAt > Date.now()) {
          sendSWMessage({
            type: 'SCHEDULE_NOTIFICATION',
            id: `ending-soon-sw-${seconds}`,
            delay: alertAt - Date.now(),
            title: `⏰ ${label} left`,
            body: `${label} remaining on: ${taskToLock.title}`,
            tag: `ending-soon-${seconds}`,
            vibrate: [100, 50, 100],
            requireInteraction: false,
          });
        }
      }
    }

    // Schedule first Pomodoro-complete (if pomodoro mode)
    if (focusTechnique === 'pomodoro' && notificationsEnabled && prefs.pomodoroComplete !== false) {
      sendSWMessage({
        type: 'SCHEDULE_POMODORO_COMPLETE',
        completesAt: Date.now() + workInterval * 60 * 1000,
        body: `Pomodoro #1 done! Time for a ${breakInterval}m break.`,
      });
    }

    if (taskToLock.status === 'not_started') {
      updateTaskMutation.mutate({
        id: taskToLock.id,
        data: { status: 'in_progress' }
      });
    }

    // Request notification permission if not already granted
    if (!notificationsEnabled) {
      requestNotificationPermission().then(granted => {
        setNotificationsEnabled(granted);
        if (granted && getNotifPrefs().sessionStart !== false) {
          showRichNotification('Focus Session Started 🎯', `Working on: ${taskToLock.title}`, { tag: 'session-start' });
        }
      });
    } else if (getNotifPrefs().sessionStart !== false) {
      showRichNotification('Focus Session Started 🎯', `Working on: ${taskToLock.title}`, { tag: 'session-start' });
    }
  };

  // Register startSession in ref so the quick-start effect can call it after definition
  startSessionRef.current = startSession;

  // Auto-start when quickStart URL param is set
  useEffect(() => {
    if (
      quickStart &&
      !quickStartFiredRef.current &&
      selectedTaskId &&
      tasks.length > 0 &&
      tasks.find(t => t.id === selectedTaskId) &&
      moodBefore &&
      !sessionStarted
    ) {
      quickStartFiredRef.current = true;
      setTimeout(() => startSessionRef.current?.(), 600);
    }
  }, [quickStart, selectedTaskId, tasks, moodBefore, sessionStarted]);

  const togglePause = () => {
    if (isActive) {
      setPauseCount(prev => prev + 1);
    }
    setIsActive(!isActive);
  };

  const skipBreak = () => {
    setIsBreakTime(false);
    setShowBreakPrompt(false);
    setShowGuidedBreak(false);
    setAdaptiveBreakConfig(null);
    setIsActive(true);
    if (focusTechnique === "pomodoro") {
      setTimeLeft(workInterval * 60);
    }
  };

  const handleAdaptiveBreak = (breakConfig) => {
    setAdaptiveBreakConfig(breakConfig);
    setShowGuidedBreak(true);
    setIsActive(false);
  };

  const skipToNextStep = () => {
    if (currentSubtaskIndex < selectedTask.subtasks.length - 1) {
      setIsActive(false);
      const nextIndex = currentSubtaskIndex + 1;
      setCurrentSubtaskIndex(nextIndex);
      const nextSubtask = selectedTask.subtasks[nextIndex];
      
      const nextTime = focusTechnique === "pomodoro" 
        ? workInterval * 60 
        : (nextSubtask?.estimated_minutes || 10) * 60;
      
      setTimeLeft(nextTime);
    }
  };

  const completeSession = async (moodAfter) => {
    // Show mood reflection first
    setShowMoodReflection(true);
    setSessionSummaryData({
      taskTitle: selectedTask.title,
      subtasksCompleted: completedSubtasks.size,
      totalSubtasks: selectedTask.subtasks?.length || 0,
      totalMinutes: sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 60000) : 0,
      moodBefore,
      moodAfter,
      pomodorosCompleted,
      focusTechnique,
      allStepsComplete,
      goalData: sessionGoalType ? {
        goalType: sessionGoalType,
        goalValue: sessionGoalValue,
        goalAchieved: false
      } : null
    });
  };

  const finishSessionAfterReflection = async (reflectionNotes) => {
    setShowMoodReflection(false);
    
    const totalDuration = sessionStartTime 
      ? Math.round((Date.now() - sessionStartTime) / 60000) 
      : selectedTask.subtasks?.reduce((sum, st) => sum + (st.estimated_minutes || 0), 0) || 0;
    
    const currentTime = new Date().getHours();
    const timeOfDay = currentTime < 12 ? "morning" : currentTime < 17 ? "afternoon" : "evening";
    
    const moodAfter = sessionSummaryData.moodAfter;
    
    // Calculate goal achievement
    let goalAchieved = false;
    let actualValue = 0;
    
    if (sessionGoalType && sessionGoalValue) {
      if (sessionGoalType === "subtasks") {
        actualValue = completedSubtasks.size;
        goalAchieved = actualValue >= sessionGoalValue;
      } else if (sessionGoalType === "time") {
        actualValue = totalDuration;
        goalAchieved = actualValue >= sessionGoalValue;
      } else if (sessionGoalType === "pomodoros") {
        actualValue = pomodorosCompleted;
        goalAchieved = actualValue >= sessionGoalValue;
      }
    }
    
    // Prepare summary data
    setSessionSummaryData({
      taskTitle: selectedTask.title,
      subtasksCompleted: completedSubtasks.size,
      totalSubtasks: selectedTask.subtasks?.length || 0,
      totalMinutes: totalDuration,
      moodBefore,
      moodAfter,
      pomodorosCompleted,
      focusTechnique,
      allStepsComplete,
      goalData: sessionGoalType ? {
        goalType: sessionGoalType,
        goalValue: sessionGoalValue,
        goalAchieved,
        actualValue
      } : null
    });
    
    await createSessionMutation.mutateAsync({
      task_id: selectedTask.id,
      task_title: selectedTask.title,
      duration_minutes: totalDuration,
      completed: allStepsComplete,
      mood_before: moodBefore,
      mood_after: moodAfter,
      notes: sessionNotes,
      focus_technique: focusTechnique,
      work_interval: workInterval,
      break_interval: breakInterval,
      ambient_sound: ambientSound,
      pomodoros_completed: pomodorosCompleted
    });

    if (allStepsComplete) {
      await updateTaskMutation.mutateAsync({
        id: selectedTask.id,
        data: { status: 'completed' }
      });
    }

    try {
      const user = await base44.auth.me();
      const progressList = await base44.entities.UserProgress.filter({ user_id: user.id });
      
      let userProgress;
      if (progressList.length === 0) {
        userProgress = await base44.entities.UserProgress.create({
          user_id: user.id,
          total_points: 0,
          level: 1,
          achievements_unlocked: [],
          tasks_completed: 0,
          focus_sessions_completed: 0,
          total_focus_minutes: 0,
          brain_dumps_created: 0,
          current_streak: 0,
          longest_streak: 0
        });
      } else {
        userProgress = progressList[0];
      }

      let pointsEarned = POINTS_SYSTEM.FOCUS_SESSION_COMPLETED;
      if (allStepsComplete) {
        pointsEarned += POINTS_SYSTEM.TASK_COMPLETED;
      }
      // Bonus for achieving goal
      if (goalAchieved) {
        pointsEarned += 10;
      }
      
      const today = new Date().toDateString();
      const lastActivity = userProgress.last_activity_date ? new Date(userProgress.last_activity_date).toDateString() : null;
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      
      let newStreak = userProgress.current_streak || 0;
      if (lastActivity !== today) {
        if (lastActivity === yesterday) {
          newStreak += 1;
        } else if (lastActivity !== yesterday && lastActivity !== today) {
          newStreak = 1;
        }
      }
      
      if (newStreak > 1) {
        pointsEarned += POINTS_SYSTEM.STREAK_BONUS * newStreak;
      }

      const updatedProgress = {
        total_points: userProgress.total_points + pointsEarned,
        focus_sessions_completed: (userProgress.focus_sessions_completed || 0) + 1,
        total_focus_minutes: (userProgress.total_focus_minutes || 0) + totalDuration,
        tasks_completed: allStepsComplete ? (userProgress.tasks_completed || 0) + 1 : userProgress.tasks_completed,
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, userProgress.longest_streak || 0),
        last_activity_date: new Date().toISOString(),
        level: calculateLevel(userProgress.total_points + pointsEarned)
      };

      const newAchievementsUnlocked = checkNewAchievements({...userProgress, ...updatedProgress}, userProgress);
      
      if (newAchievementsUnlocked.length > 0) {
        const achievementIds = newAchievementsUnlocked.map(a => a.id);
        const achievementPoints = newAchievementsUnlocked.reduce((sum, a) => sum + a.points, 0);
        updatedProgress.total_points += achievementPoints;
        updatedProgress.achievements_unlocked = [
          ...(userProgress.achievements_unlocked || []),
          ...achievementIds
        ];
        
        setNewAchievements(newAchievementsUnlocked);
        setShowAchievement(newAchievementsUnlocked[0]);
      }

      await base44.entities.UserProgress.update(userProgress.id, updatedProgress);

      // Save journey data for personalized recommendations
      const effectivenessScore = Math.round(
        ((completedSubtasks.size / (selectedTask.subtasks?.length || 1)) * 50) +
        (goalAchieved ? 30 : 0) +
        (moodAfter === 'accomplished' || moodAfter === 'energized' ? 20 : 0)
      );

      await base44.entities.FocusJourney.create({
        user_id: user.id,
        session_date: new Date().toISOString().split('T')[0],
        task_category: selectedTask.category,
        task_difficulty: selectedTask.difficulty,
        focus_technique: focusTechnique,
        work_interval: workInterval,
        break_interval: breakInterval,
        ambient_sound: ambientSound,
        mood_before: moodBefore,
        mood_after: moodAfter,
        energy_before: selectedTask.energy_level_needed,
        duration_minutes: totalDuration,
        subtasks_completed: completedSubtasks.size,
        total_subtasks: selectedTask.subtasks?.length || 0,
        effectiveness_score: effectivenessScore,
        pause_count: pauseCount,
        goal_achieved: goalAchieved,
        mindfulness_used: includeMindfulness,
        mindfulness_type: mindfulnessType,
        time_of_day: timeOfDay
      });

      queryClient.invalidateQueries({ queryKey: ['focusJourney'] });
    } catch (error) {
      console.error("Error updating progress:", error);
    }

    setShowBreakPrompt(false);
    
    // Update session summary with final goal achievement
    setSessionSummaryData(prev => ({
      ...prev,
      goalData: prev.goalData ? {
        ...prev.goalData,
        goalAchieved,
        actualValue
      } : null
    }));
    
    setShowPostSummary(true);
  };
  
  const resetSession = () => {
    setLockedTask(null);
    setSessionStarted(false);
    setIsActive(false);
    setCompletedSubtasks(new Set());
    setMoodBefore(null);
    setSessionNotes("");
    setCurrentSubtaskIndex(0);
    setTimeLeft(0);
    setAllStepsComplete(false);
    setPomodorosCompleted(0);
    setIsBreakTime(false);
    setSoundEnabled(false);
    setSessionGoalType(null);
    setSessionGoalValue(null);
    setSessionStartTime(null);
    setShowPostSummary(false);
    setSessionSummaryData(null);
    setSessionId(null);
    setPauseCount(0);
    setDynamicBreakSuggestion(null);
    
    // Clear any stored session
    if (sessionId) {
      localStorage.removeItem(`focus_session_${sessionId}`);
    }

    cancelAllNotifications();
    stopSWKeepAlive();
    endingSoonFiredRef.current = new Set();
    resetVoice();
    // Clear cross-device sync record
    setIsController(false);
    clearSyncSession();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = currentSubtask ? ((currentSubtask.estimated_minutes * 60 - timeLeft) / (currentSubtask.estimated_minutes * 60)) * 100 : 0;
  const pomodoroProgress = focusTechnique === "pomodoro" ? ((isBreakTime ? breakInterval : workInterval) * 60 - timeLeft) / ((isBreakTime ? breakInterval : workInterval) * 60) * 100 : 0;

  const getCompanionMessage = () => {
    if (showBreakPrompt && allStepsComplete) {
      const level = userProgress?.level || 1;
      if (level >= 10) return "LEGENDARY finish! You're unstoppable! How do you feel? 👑🎉";
      return "Amazing! You completed all the steps! How do you feel? 🎉";
    }
    if (showBreakPrompt && isBreakTime) return "Great work! Time for a break. Stretch, hydrate, or relax!💧";
    if (!sessionStarted) {
      return getPersonalizedMessage(userProgress, "focus_start");
    }
    if (isBreakTime) return "Break time! Rest your mind for a bit.";
    if (isActive) return `Working on: ${currentSubtask?.title}`;
    return "Take your time. I'll be here when you're ready to continue.";
  };

  const getCompanionMood = () => {
    if (showBreakPrompt) return "celebrating";
    if (isActive) return "working";
    return "supportive";
  };

  return (
    <div className="min-h-screen p-4 md:p-8 pb-24 md:pb-8">
      <OfflineIndicator
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        onRetry={flushQueue}
      />
      <AdaptiveBreakSuggestion
        sessionState={{
          isActive,
          isBreakTime,
          timeLeft,
          sessionStartTime,
          moodBefore,
          focusTechnique,
          completedSubtasks: completedSubtasks.size,
          totalSubtasks: selectedTask?.subtasks?.length || 0,
          pauseCount
        }}
        journeyData={journeyData}
        onTakeBreak={handleAdaptiveBreak}
      />
      {sessionStarted && selectedTask && (
        <SessionCoach 
          task={selectedTask}
          sessionDuration={focusTechnique === "pomodoro" ? workInterval * 60 : (currentSubtask?.estimated_minutes || 10) * 60}
          currentProgress={timeLeft}
          elapsedMinutes={sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 60000) : 0}
          mood={moodBefore}
          pauseCount={pauseCount}
        />
      )}
      
      <RealTimeAICoach
        sessionState={{
          isActive,
          isBreakTime,
          timeLeft,
          sessionStartTime,
          moodBefore,
          ambientSound,
          focusTechnique,
          completedSubtasks,
          totalSubtasks: selectedTask?.subtasks?.length || 0,
          pauseCount
        }}
        onSuggestion={handleAISuggestion}
      />
      <FocusBoosterBot
        currentTask={selectedTask}
        timeLeft={timeLeft}
        isActive={isActive}
        moodBefore={moodBefore}
        sessionDuration={focusTechnique === "pomodoro" ? workInterval * 60 : (currentSubtask?.estimated_minutes || 10) * 60}
        showBot={showFocusBot && sessionStarted && !isBreakTime}
        onDismiss={() => setShowFocusBot(false)}
      />
      <AchievementNotification 
        achievement={showAchievement} 
        onClose={() => {
          const currentIndex = newAchievements.findIndex(a => a.id === showAchievement?.id);
          if (currentIndex < newAchievements.length - 1) {
            setShowAchievement(newAchievements[currentIndex + 1]);
          } else {
            setShowAchievement(null);
            setNewAchievements([]);
          }
        }}
      />
      
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-teal-600 dark:from-purple-400 dark:to-teal-400 bg-clip-text text-transparent">
            Focus Session 🎯
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Let's work through each step together!</p>
        </motion.div>

        <VirtualCompanion 
                    mood={getCompanionMood()}
                    message={getCompanionMessage()}
                    size="small"
                    showActivity={sessionStarted && isActive && !isBreakTime}
                    characterType={currentUser?.companion_type || "human"}
                    userProgress={userProgress}
                  />

        <AnimatePresence>
          {showEncouragement && sessionStarted && !isBreakTime && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50"
            >
              <div className="bg-gradient-to-r from-purple-500 to-teal-500 text-white px-6 py-3 rounded-full shadow-2xl border-2 border-white">
                <p className="font-medium text-sm">{currentEncouragement}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showPostSummary && sessionSummaryData ? (
          <PostSessionSummary
            sessionData={sessionSummaryData}
            goalData={sessionSummaryData.goalData}
            onClose={() => {
              resetSession();
              window.location.href = "/Dashboard";
            }}
            onStartNew={resetSession}
          />
        ) : !sessionStarted ? (
          <Tabs defaultValue="setup" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 dark:bg-gray-800">
              <TabsTrigger value="setup" className="dark:data-[state=active]:bg-gray-700 text-xs sm:text-sm">Setup</TabsTrigger>
              <TabsTrigger value="pomodoro" className="dark:data-[state=active]:bg-gray-700 text-xs sm:text-sm">🍅 Timer</TabsTrigger>
              <TabsTrigger value="dynamic" className="dark:data-[state=active]:bg-gray-700 text-xs sm:text-sm">AI</TabsTrigger>
              <TabsTrigger value="templates" className="dark:data-[state=active]:bg-gray-700 text-xs sm:text-sm">Templates</TabsTrigger>
              <TabsTrigger value="metrics" className="dark:data-[state=active]:bg-gray-700 text-xs sm:text-sm">📊 Metrics</TabsTrigger>
            </TabsList>

            <TabsContent value="setup">
              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-100 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="dark:text-gray-100">Start Your Session</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Choose a task</Label>
                <Select value={selectedTaskId || ""} onValueChange={setSelectedTaskId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a task to work on">
                      {selectedTaskId && !tasks.find(t => t.id === selectedTaskId) && preselectedTaskTitle
                        ? preselectedTaskTitle
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.filter(t => t.status !== 'completed').map(task => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.team_id && "👥 "}
                        {task.title} ({task.subtasks?.length || 0} steps)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTask && (
                <div className="space-y-2 p-4 bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-900/30 dark:to-teal-900/30 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Task Steps:</p>
                  {selectedTask.subtasks?.map((subtask, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <span className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400">
                          {index + 1}
                        </span>
                        {subtask.title}
                      </span>
                      <Badge variant="outline" className="flex items-center gap-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                        <Clock className="w-3 h-3" />
                        {subtask.estimated_minutes}m
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <Label className="text-base font-semibold dark:text-gray-200">Focus Technique</Label>
                </div>
                
                <Select value={focusTechnique} onValueChange={setFocusTechnique}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (Follow task times)</SelectItem>
                    <SelectItem value="pomodoro">Pomodoro Technique</SelectItem>
                  </SelectContent>
                </Select>

                {focusTechnique === "pomodoro" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label>Work Interval: {workInterval} minutes</Label>
                      <Slider
                        value={[workInterval]}
                        onValueChange={(value) => setWorkInterval(value[0])}
                        min={5}
                        max={90}
                        step={5}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Break Interval: {breakInterval} minutes</Label>
                      <Slider
                        value={[breakInterval]}
                        onValueChange={(value) => setBreakInterval(value[0])}
                        min={1}
                        max={30}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 p-2 rounded">
                      💡 Pomodoro: Work in focused intervals with short breaks in between
                    </div>
                  </motion.div>
                )}
              </div>

              <AmbientSoundPlayer
                selectedSound={ambientSound}
                setSelectedSound={setAmbientSound}
                isPlaying={false}
              />

              {hasFeatureAccess(currentUser?.subscription_tier, "spotify_player") ? (
                <SpotifyPlayer isSessionActive={false} />
              ) : (
                <UpgradePrompt feature="Spotify Focus Music" requiredTier="pro" compact />
              )}

              {hasFeatureAccess(currentUser?.subscription_tier, "cross_device_notifications") ? (
                <FocusNotificationSettings
                  onPermissionChange={(granted) => setNotificationsEnabled(granted)}
                />
              ) : (
                <UpgradePrompt feature="Smartwatch & Cross-Device Notifications" requiredTier="pro" compact />
              )}

              <SmartTimerRecommendations
                currentMood={moodBefore}
                energyLevel={selectedTask?.energy_level_needed}
                taskDifficulty={selectedTask?.difficulty}
                journeyData={journeyData}
                onApplyRecommendation={(settings) => {
                  setWorkInterval(settings.workInterval);
                  setBreakInterval(settings.breakInterval);
                  setFocusTechnique(settings.focusTechnique);
                  setAmbientSound(settings.ambientSound);
                }}
              />

              {selectedTask && (
                <CalendarFocusBlocker
                  task={selectedTask}
                  estimatedDuration={selectedTask.subtasks?.reduce((sum, st) => sum + (st.estimated_minutes || 0), 0) || 30}
                  onBlockCreated={() => {
                    // Refresh tasks to show updated focus_block_scheduled flag
                    queryClient.invalidateQueries({ queryKey: ['focusSessionTasks'] });
                  }}
                />
              )}
              
              <SessionGoals
                selectedGoal={sessionGoalType}
                setSelectedGoal={setSessionGoalType}
                goalValue={sessionGoalValue}
                setGoalValue={setSessionGoalValue}
                maxSubtasks={selectedTask?.subtasks?.length || 5}
                focusTechnique={focusTechnique}
              />

              <div className="space-y-2">
                <Label className="dark:text-gray-200">How are you feeling right now?</Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    { mood: 'energized', emoji: '⚡' },
                    { mood: 'focused', emoji: '🎯' },
                    { mood: 'tired', emoji: '😴' },
                    { mood: 'anxious', emoji: '😰' },
                    { mood: 'neutral', emoji: '😐' },
                  ].map(({ mood, emoji }) => (
                    <Button
                      key={mood}
                      variant={moodBefore === mood ? "default" : "outline"}
                      onClick={() => setMoodBefore(mood)}
                      className={`flex flex-col h-auto py-3 gap-1 text-xs capitalize min-h-[56px] ${moodBefore === mood ? "bg-gradient-to-r from-purple-500 to-teal-500 text-white border-transparent" : "dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"}`}
                    >
                      <span className="text-lg">{emoji}</span>
                      {mood}
                    </Button>
                  ))}
                </div>
              </div>

              {preSessionRitual && moodBefore && (
                <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/30 dark:to-purple-900/30 rounded-lg border border-pink-200 dark:border-pink-800">
                  <p className="text-xs font-semibold text-pink-900 dark:text-pink-300 mb-2 flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    Recommended Pre-Session Ritual:
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{preSessionRitual}</p>
                </div>
              )}

              {/* Voice Announcements toggle */}
              <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">🎧 Voice Announcements</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Hear time remaining through AirPods or headphones</p>
                </div>
                <button
                  onClick={() => setVoiceAnnouncementsEnabled(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${voiceAnnouncementsEnabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${voiceAnnouncementsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {!selectedTaskId && (
                <p className="text-center text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg py-2 px-3">
                  Please select a task above to begin
                </p>
              )}
              {selectedTaskId && !moodBefore && (
                <p className="text-center text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg py-2 px-3">
                  Please select how you're feeling to begin
                </p>
              )}
              <Button
                onClick={startSession}
                disabled={!selectedTaskId || !moodBefore}
                className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 disabled:opacity-40 text-white font-semibold py-6 text-lg shadow-lg"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Focus Session
              </Button>
              {/* Extra bottom padding so mobile tab bar doesn't cover the button */}
              <div className="h-6 md:hidden" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dynamic">
              <div className="space-y-4">
                <MoodCoach
                  currentMood={moodBefore}
                  journeyData={journeyData}
                  onSuggestRitual={(ritual) => {
                    setPreSessionRitual(ritual);
                    toast("Pre-session ritual suggested! 🧘", { duration: 3000 });
                  }}
                />

                <PersonalizedJourneyAnalyzer
                  currentUser={currentUser}
                  journeyData={journeyData}
                />

                <JourneyRecommendations
                  currentMood={moodBefore}
                  currentEnergy={selectedTask?.energy_level_needed}
                  taskDifficulty={selectedTask?.difficulty}
                  journeyData={journeyData}
                  onApplyRecommendation={(settings) => {
                    setFocusTechnique(settings.focusTechnique);
                    setWorkInterval(settings.workInterval);
                    setBreakInterval(settings.breakInterval);
                    setAmbientSound(settings.ambientSound);
                    setIncludeMindfulness(settings.includeMindfulness);
                    setMindfulnessType(settings.mindfulnessType);
                  }}
                />
                
                <DynamicTemplateGenerator
                  selectedTask={selectedTask}
                  currentMood={moodBefore}
                  currentEnergy={selectedTask?.energy_level_needed}
                  onApplyTemplate={handleApplyTemplate}
                />
                
                {selectedTaskId && (
                  <AdvancedControls
                    task={selectedTask}
                    currentMood={moodBefore}
                    currentEnergy={selectedTask?.energy_level_needed}
                    sessionDuration={0}
                    onApplySettings={handleAdvancedSettings}
                    onTaskAdjustment={handleTaskAdjustment}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="pomodoro">
              <div className="space-y-4">
                <PomodoroTimer
                  isActive={isActive && sessionStarted}
                  onCycleComplete={(cycles) => {
                    setPomodorosCompleted(cycles);
                    toast.success(`🍅 Pomodoro #${cycles} complete!`);
                  }}
                />
                <DistractionBlocker isSessionActive={sessionStarted && isActive} />
              </div>
            </TabsContent>

            <TabsContent value="templates">
              <FocusSessionTemplates 
                onSelectTemplate={handleApplyTemplate}
                currentUser={currentUser}
              />
            </TabsContent>

            <TabsContent value="metrics">
              <SessionMetrics
                sessions={sessions}
                currentSessionMinutes={sessionStarted && sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 60000) : 0}
                isActive={sessionStarted && isActive}
              />
            </TabsContent>
          </Tabs>
        ) : !selectedTask ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence>
            {!showBreakPrompt || isBreakTime ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-100 dark:border-gray-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Step {currentSubtaskIndex + 1} of {selectedTask.subtasks?.length || 0}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-gradient-to-r from-purple-500 to-teal-500 text-white">
                          {completedSubtasks.size} completed
                        </Badge>
                        {focusTechnique === "pomodoro" && (
                          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                            🍅 {pomodorosCompleted} Pomodoros
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={selectedTask.subtasks?.length ? (completedSubtasks.size / selectedTask.subtasks.length) * 100 : 0} 
                      className="h-2 mb-2" 
                    />
                  </CardContent>
                </Card>

                <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-100 dark:border-gray-700">
                  <CardContent className="pt-6">
                    <div className="text-center mb-6">
                      {isBreakTime ? (
                        <>
                          <div className="flex items-center justify-center gap-2 mb-4">
                            <Coffee className="w-6 h-6 text-teal-500 dark:text-teal-400" />
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Break Time!</h3>
                          </div>
                          {dynamicBreakSuggestion ? (
                            <div className="mb-4 p-3 bg-teal-50 dark:bg-teal-900/30 rounded-lg border border-teal-200 dark:border-teal-800">
                              <p className="text-sm font-medium text-teal-900 dark:text-teal-300 mb-1">Suggested Activity:</p>
                              <p className="text-sm text-teal-700 dark:text-teal-400">{dynamicBreakSuggestion}</p>
                            </div>
                          ) : (
                            <p className="text-gray-600 dark:text-gray-400 mb-4">Take a short break to recharge</p>
                          )}
                        </>
                      ) : (
                        <>
                          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Current Step:</h3>
                          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{currentSubtask?.title}</p>
                        </>
                      )}
                      
                      <div className={`text-7xl font-bold mb-4 ${isBreakTime ? 'bg-gradient-to-r from-teal-600 to-blue-600' : 'bg-gradient-to-r from-purple-600 to-teal-600'} bg-clip-text text-transparent`}>
                        {formatTime(timeLeft)}
                      </div>
                      <Progress value={focusTechnique === "pomodoro" ? pomodoroProgress : progress} className="h-3 mb-2" />
                      {!isBreakTime && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {focusTechnique === "pomodoro" ? `Work: ${workInterval} min` : `Estimated: ${currentSubtask?.estimated_minutes} minutes`}
                        </p>
                      )}
                    </div>

                    {ambientSound !== "none" && !isBreakTime && (
                      <AmbientSoundPlayer
                        selectedSound={ambientSound}
                        setSelectedSound={setAmbientSound}
                        isPlaying={isActive}
                        compact
                      />
                    )}
                    {!isBreakTime && hasFeatureAccess(currentUser?.subscription_tier, "spotify_player") && (
                      <SpotifyPlayer isSessionActive={isActive} compact />
                    )}
                    {!isBreakTime && (
                      <DistractionBlocker isSessionActive={isActive} />
                    )}
                    
                    {/* Goal Progress Indicator */}
                    {sessionGoalType && sessionGoalValue && !isBreakTime && (
                      <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-orange-700 dark:text-orange-300">Session Goal</span>
                          <span className="text-orange-600 dark:text-orange-400">
                            {sessionGoalType === "subtasks" && `${completedSubtasks.size}/${sessionGoalValue} steps`}
                            {sessionGoalType === "time" && `${sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 60000) : 0}/${sessionGoalValue} min`}
                            {sessionGoalType === "pomodoros" && `${pomodorosCompleted}/${sessionGoalValue} 🍅`}
                          </span>
                        </div>
                        <Progress 
                          value={
                            sessionGoalType === "subtasks" ? (completedSubtasks.size / sessionGoalValue) * 100 :
                            sessionGoalType === "time" ? (sessionStartTime ? ((Date.now() - sessionStartTime) / 60000 / sessionGoalValue) * 100 : 0) :
                            (pomodorosCompleted / sessionGoalValue) * 100
                          } 
                          className="h-2 mt-2" 
                        />
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={togglePause}
                          size="lg"
                          className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
                        >
                          {isActive ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                          {isActive ? "Pause" : "Resume"}
                        </Button>
                        {isBreakTime && (
                          <Button 
                            onClick={skipBreak} 
                            variant="outline" 
                            size="lg"
                            className="w-full"
                          >
                            Skip Break
                          </Button>
                        )}
                        {!isBreakTime && (
                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              onClick={handleCompleteEarly}
                              variant="outline"
                              size="lg"
                              className="border-green-200 text-green-700 hover:bg-green-50"
                            >
                              <CheckCircle className="w-5 h-5 mr-2" />
                              Complete
                            </Button>
                            <Button 
                              onClick={handleNeedMoreTime}
                              variant="outline"
                              size="lg"
                              className="border-orange-200 text-orange-700 hover:bg-orange-50"
                            >
                              <Clock className="w-5 h-5 mr-2" />
                              +More Time
                            </Button>
                          </div>
                        )}
                      </div>
                      {!isBreakTime && currentSubtaskIndex < (selectedTask.subtasks?.length || 0) - 1 && (
                        <div className="flex justify-center">
                          <Button 
                            onClick={skipToNextStep} 
                            variant="ghost" 
                            size="sm"
                            className="text-gray-500"
                          >
                            <ChevronRight className="w-4 h-4 mr-1" />
                            Skip to Next Step
                          </Button>
                        </div>
                      )}
                    </div>

                    {!isBreakTime && (
                      <div className="mt-4 flex justify-center">
                        <VoiceCommandListener
                          isSessionActive={sessionStarted}
                          isActive={isActive}
                          onStart={() => setIsActive(true)}
                          onPause={togglePause}
                          onSkip={skipToNextStep}
                          onComplete={handleCompleteEarly}
                          onAddTime={handleNeedMoreTime}
                          onEndSession={() => {
                            setAllStepsComplete(false);
                            setShowBreakPrompt(true);
                          }}
                        />
                      </div>
                    )}

                    {!isBreakTime && (
                      <div className="mt-6 space-y-2">
                        <Label>Session notes (optional)</Label>
                        <Textarea
                          value={sessionNotes}
                          onChange={(e) => setSessionNotes(e.target.value)}
                          placeholder="Jot down any thoughts, ideas, or progress..."
                          className="h-24"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {!isBreakTime && selectedTask.subtasks?.length > 0 && (
                  <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-100 dark:border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-lg dark:text-gray-100">All Steps</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selectedTask.subtasks.map((subtask, index) => {
                        const isCompleted = completedSubtasks.has(index);
                        const isCurrent = index === currentSubtaskIndex;

                        return (
                          <div
                            key={index}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                              isCurrent
                                ? 'bg-gradient-to-r from-purple-100 to-teal-100 dark:from-purple-900/40 dark:to-teal-900/40 border-2 border-purple-300 dark:border-purple-600'
                                : isCompleted
                                ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                                : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                            }`}
                          >
                            <Checkbox
                              checked={isCompleted}
                              disabled={index !== currentSubtaskIndex}
                              onCheckedChange={(checked) => {
                                if (checked && isCurrent) {
                                  handleCompleteEarly();
                                }
                              }}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <span className={isCompleted ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-200"}>
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
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-100 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                      {allStepsComplete ? (
                        <>
                          <CheckCircle className="w-6 h-6 text-green-500" />
                          All Steps Complete! 🎉
                        </>
                      ) : (
                        <>
                          <Coffee className="w-6 h-6 text-teal-500" />
                          Step Complete!
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {focusTechnique === "pomodoro" && (
                      <div className="p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-800">
                        <p className="text-center font-semibold text-orange-700 dark:text-orange-300">
                          🍅 You completed {pomodorosCompleted} Pomodoro{pomodorosCompleted !== 1 ? 's' : ''}!
                        </p>
                      </div>
                    )}
                    
                    <p className="text-gray-700 dark:text-gray-300">
                      {allStepsComplete 
                        ? "Incredible work! You completed all the steps! I'm so proud of you! 🎉" 
                        : "Great job! Ready to continue with the next step?"}
                    </p>
                    
                    {showMoodReflection ? (
                      <PostSessionMoodReflection
                        moodBefore={moodBefore}
                        moodAfter={sessionSummaryData?.moodAfter}
                        sessionData={sessionSummaryData}
                        onComplete={finishSessionAfterReflection}
                      />
                    ) : (
                      <div className="space-y-2">
                        <Label>How are you feeling now?</Label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          {['accomplished', 'frustrated', 'tired', 'energized', 'neutral'].map(mood => (
                            <Button
                              key={mood}
                              variant="outline"
                              onClick={() => completeSession(mood)}
                              className="hover:bg-gradient-to-r hover:from-purple-500 hover:to-teal-500 hover:text-white"
                            >
                              {mood}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {showGuidedBreak && adaptiveBreakConfig && (
          <GuidedBreakFlow
            breakConfig={adaptiveBreakConfig}
            onComplete={() => {
              setShowGuidedBreak(false);
              setAdaptiveBreakConfig(null);
              setIsActive(true);
              toast.success("Great break! Back to focus!");
            }}
            onSkip={skipBreak}
          />
        )}

        <FocusCompanionChat
          isSessionActive={sessionStarted && isActive && !isBreakTime}
          taskTitle={selectedTask?.title}
          currentUser={currentUser}
        />

        {showMindfulness && !showGuidedBreak && (
          <MindfulnessBreak
            type={mindfulnessType}
            duration={breakInterval * 60}
            onComplete={() => {
              setShowMindfulness(false);
              setIsBreakTime(true);
              setTimeLeft(breakInterval * 60);
              setShowBreakPrompt(true);
            }}
            onSkip={() => {
              setShowMindfulness(false);
              setIsBreakTime(false);
              setShowBreakPrompt(false);
              handleSubtaskComplete();
            }}
          />
        )}
      </div>
    </div>
  );
}