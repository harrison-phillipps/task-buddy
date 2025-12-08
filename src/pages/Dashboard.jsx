import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles, TrendingUp, Clock, CheckCircle, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import VirtualCompanion from "../components/VirtualCompanion";
import { generateCompanionMessage } from "../components/ai/CompanionAI";
import TaskCard from "../components/TaskCard";
import SmartTaskSuggestion from "../components/SmartTaskSuggestion";
import AIPrioritization from "../components/AIPrioritization";
import WeeklyOverview from "../components/dashboard/WeeklyOverview";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { getPersonalizedMessage, getProductivityTip } from "@/components/companionUtils";
import ProactiveCoachingTip from "../components/ProactiveCoachingTip";
import ProgressReportModal from "../components/ai/ProgressReportModal";
import { FileText } from "lucide-react";
import QuickAddTask from "../components/dashboard/QuickAddTask";
import GoalsProgress from "../components/dashboard/GoalsProgress";
import WidgetCustomizer from "../components/dashboard/WidgetCustomizer";

export default function Dashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [showCoachingTip, setShowCoachingTip] = useState(true);
  const [coachingTip, setCoachingTip] = useState(null);
  const [showProgressReport, setShowProgressReport] = useState(false);
  const [aiMessage, setAiMessage] = useState(null);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState(() => {
    const saved = localStorage.getItem('dashboardWidgets');
    return saved ? JSON.parse(saved) : {
      stats: true,
      quickAdd: true,
      goalsProgress: true,
      weeklyOverview: true,
      aiPrioritization: true,
      companion: true
    };
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', currentUser?.email],
    queryFn: () => currentUser ? base44.entities.Task.filter({ created_by: currentUser.email }, '-created_date') : [],
    enabled: !!currentUser,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', currentUser?.email],
    queryFn: () => currentUser ? base44.entities.FocusSession.filter({ created_by: currentUser.email }, '-created_date', 10) : [],
    enabled: !!currentUser,
  });

  const { data: calendarEvents = [] } = useQuery({
    queryKey: ['calendarEvents', currentUser?.email],
    queryFn: () => currentUser ? base44.entities.CalendarEvent.filter({ created_by: currentUser.email }, 'start_date') : [],
    enabled: !!currentUser,
  });

  // Check if user has completed onboarding
  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        // Check onboarding first
        if (!user.display_name) {
          navigate(createPageUrl("Onboarding"));
          return;
        }
        
        if (!user.companion_type) {
          navigate(createPageUrl("CharacterSelection"));
          return;
        }
        
        // Fetch progress
        const progressList = await base44.entities.UserProgress.filter({ user_id: user.id });
        if (progressList.length > 0) {
          setUserProgress(progressList[0]);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    checkUser();
  }, [navigate]);

  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedToday = tasks.filter(t => {
    if (t.status !== 'completed') return false;
    const today = new Date().toDateString();
    return new Date(t.updated_date).toDateString() === today;
  });

  const totalMinutesWorked = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getCompanionMessage = () => {
    const displayName = currentUser?.display_name || "friend";
    if (completedToday.length > 0) {
      const level = userProgress?.level || 1;
      if (level >= 10) {
        return `LEGENDARY, ${displayName}! ${completedToday.length} task${completedToday.length > 1 ? 's' : ''} crushed today! You're unstoppable! 👑🎉`;
      }
      return `Amazing, ${displayName}! You've completed ${completedToday.length} task${completedToday.length > 1 ? 's' : ''} today! 🎉`;
    }
    if (inProgressTasks.length > 0) {
      return getPersonalizedMessage(userProgress, "dashboard", currentUser);
    }
    return getPersonalizedMessage(userProgress, "dashboard", currentUser);
  };

  const currentLevel = userProgress ? Math.floor(userProgress.total_points / 200) + 1 : 1;

  const handleToggleWidget = (widgetId) => {
    const updated = { ...visibleWidgets, [widgetId]: !visibleWidgets[widgetId] };
    setVisibleWidgets(updated);
    localStorage.setItem('dashboardWidgets', JSON.stringify(updated));
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8 overflow-x-hidden w-full">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 w-full px-2 sm:px-0">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <div className="flex items-center justify-center gap-4 mb-3">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
              {getGreeting()}! 👋
            </h1>
          </div>
          <p className="text-gray-600 text-lg mb-4">Let's make progress together, one step at a time</p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            {userProgress && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full border-2 border-yellow-300"
              >
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span className="font-bold text-gray-900">Level {currentLevel}</span>
                <span className="text-gray-600">•</span>
                <span className="font-bold text-purple-600">{userProgress.total_points} points</span>
              </motion.div>
            )}
            <WidgetCustomizer visibleWidgets={visibleWidgets} onToggleWidget={handleToggleWidget} />
          </div>
        </motion.div>

        {/* Virtual Companion */}
        {visibleWidgets.companion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full overflow-hidden"
          >
            <VirtualCompanion 
              mood={completedToday.length > 0 ? "celebrating" : "supportive"}
              message={isLoadingMessage ? "Thinking..." : (aiMessage || getCompanionMessage())}
              characterType={currentUser.companion_type}
              userProgress={userProgress}
              context="dashboard"
              enableFeedback={!!aiMessage}
            />
          </motion.div>
        )}

        {/* Quick Add Task */}
        {visibleWidgets.quickAdd && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <QuickAddTask currentUser={currentUser} />
          </motion.div>
        )}

        {/* Proactive Coaching Tip */}
        {coachingTip && showCoachingTip && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ProactiveCoachingTip
              tip={coachingTip}
              onDismiss={() => setShowCoachingTip(false)}
            />
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4"
        >
          <div onClick={() => setShowProgressReport(true)}>
            <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 border-none hover:shadow-2xl transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6 text-white">
                <FileText className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl font-bold mb-2">Progress Report</h3>
                <p className="text-blue-100">AI-powered weekly summary</p>
              </CardContent>
            </Card>
          </div>

          <Link to={createPageUrl("BrainDump")}>
            <Card className="bg-gradient-to-br from-indigo-500 to-purple-500 border-none hover:shadow-2xl transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6 text-white">
                <Brain className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl font-bold mb-2">Brain Dump</h3>
                <p className="text-indigo-100">Empty your mind and organize your thoughts</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("TaskBreakdown")}>
            <Card className="bg-gradient-to-br from-purple-500 to-teal-500 border-none hover:shadow-2xl transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6 text-white">
                <Sparkles className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl font-bold mb-2">Break Down Task</h3>
                <p className="text-purple-100">Turn one task into easy steps</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("FocusSession")}>
            <Card className="bg-gradient-to-br from-pink-500 to-orange-500 border-none hover:shadow-2xl transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6 text-white">
                <Clock className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl font-bold mb-2">Focus Session</h3>
                <p className="text-pink-100">Work with your virtual buddy</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        {/* Goals Progress Visualization */}
        {visibleWidgets.goalsProgress && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <GoalsProgress currentUser={currentUser} />
          </motion.div>
        )}

        {/* Stats */}
        {visibleWidgets.stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-6"
          >
          <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Completed Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-gray-900">{completedToday.length}</p>
              <p className="text-sm text-gray-500 mt-1">tasks finished</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-gray-900">{inProgressTasks.length}</p>
              <p className="text-sm text-gray-500 mt-1">active tasks</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-500" />
                Time Focused
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-gray-900">{totalMinutesWorked}</p>
              <p className="text-sm text-gray-500 mt-1">minutes total</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-yellow-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{userProgress?.current_streak || 0} 🔥</p>
              <p className="text-sm text-yellow-100 mt-1">days in a row!</p>
              </CardContent>
              </Card>
              </motion.div>
              )}

        {/* Weekly Overview */}
        {visibleWidgets.weeklyOverview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <WeeklyOverview tasks={tasks} />
          </motion.div>
        )}

        {/* AI Prioritization */}
        {visibleWidgets.aiPrioritization && tasks.filter(t => t.status !== 'completed').length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <AIPrioritization 
              tasks={tasks} 
              userProgress={userProgress}
              userTier={currentUser?.subscription_tier || "free"}
              calendarEvents={calendarEvents}
              showFullList={true}
            />
          </motion.div>
        )}

        {/* Empty State */}
        {tasks.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center py-12"
          >
            <div className="w-32 h-32 bg-gradient-to-br from-purple-200 to-teal-200 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Brain className="w-16 h-16 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Ready to get started?</h3>
            <p className="text-gray-600 mb-6">Dump everything on your mind and I'll organize it for you!</p>
            <Link to={createPageUrl("BrainDump")}>
              <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold px-8 py-6 text-lg shadow-lg">
                <Brain className="w-5 h-5 mr-2" />
                Start Brain Dump
              </Button>
            </Link>
          </motion.div>
        )}

        <ProgressReportModal
          open={showProgressReport}
          onOpenChange={setShowProgressReport}
          userProgress={userProgress}
          timeframe="week"
        />
        </div>
        </div>
        );
        }