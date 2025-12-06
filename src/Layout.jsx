import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles, ListTodo, Play, LayoutDashboard, User, RefreshCw, Brain, Award, Trophy, MessageSquare, Calendar, BookOpen, Users, Target } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import React from "react";
import PersonalitySettingsModal from "@/components/PersonalitySettingsModal";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Subscription",
    url: createPageUrl("Subscription"),
    icon: Sparkles,
  },
  {
    title: "Brain Dump",
    url: createPageUrl("BrainDump"),
    icon: Brain,
  },
  {
    title: "Journal",
    url: createPageUrl("Journal"),
    icon: BookOpen,
  },
  {
    title: "AI Task Generator",
    url: createPageUrl("AITaskGenerator"),
    icon: Sparkles,
  },
  {
    title: "Break Down Task",
    url: createPageUrl("TaskBreakdown"),
    icon: Sparkles,
  },
  {
    title: "Goals",
    url: createPageUrl("Goals"),
    icon: Target,
  },
  {
    title: "My Tasks",
    url: createPageUrl("Tasks"),
    icon: ListTodo,
  },
  {
    title: "Calendar",
    url: createPageUrl("CalendarView"),
    icon: Calendar,
  },
  {
    title: "Focus Session",
    url: createPageUrl("FocusSession"),
    icon: Play,
  },
  {
    title: "Achievements",
    url: createPageUrl("Achievements"),
    icon: Award,
  },
  {
    title: "Leaderboard",
    url: createPageUrl("LeaderboardPage"),
    icon: Trophy,
  },
  {
    title: "Teams",
    url: createPageUrl("Teams"),
    icon: Users,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = React.useState(null);
  const [userProgress, setUserProgress] = React.useState(null);
  const [showPersonalityModal, setShowPersonalityModal] = React.useState(false);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        // Fetch user progress
        const progressList = await base44.entities.UserProgress.filter({ user_id: user.id });
        if (progressList.length > 0) {
          setUserProgress(progressList[0]);
        } else {
          // If no progress, initialize it (or handle as needed)
          setUserProgress(null);
        }
      } catch (error) {
        console.error("Error fetching user or user progress:", error);
        setCurrentUser(null);
        setUserProgress(null);
      }
    };
    fetchUser();
  }, [location.pathname]); // Refetch when navigating

  const handleChangeCompanion = () => {
    navigate(createPageUrl("CharacterSelection"));
  };

  const getCompanionEmoji = () => {
    if (currentUser?.companion_type === 'cat') return '🐱';
    if (currentUser?.companion_type === 'dog') return '🐶';
    if (currentUser?.companion_type === 'orb') return '🔮';
    return '👤';
  };

  const getCompanionName = () => {
    if (currentUser?.companion_type === 'cat') return 'Cozy Cat';
    if (currentUser?.companion_type === 'dog') return 'Playful Dog';
    if (currentUser?.companion_type === 'orb') return 'Magic Orb';
    return 'Soft Human';
  };

  const getPersonalityLabel = () => {
    const labels = {
      motivational: "🔥 Motivational",
      calm: "🧘 Calm",
      witty: "😄 Witty",
      direct: "⚡ Direct"
    };
    return labels[currentUser?.companion_personality] || "🔥 Motivational";
  };

  const refreshUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };

  const currentLevel = userProgress ? Math.floor(userProgress.total_points / 200) + 1 : 1;

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --primary-purple: #8B5CF6;
          --primary-teal: #14B8A6;
          --accent-coral: #FB7185;
          --warm-bg: #FAF9F7;
          --soft-purple: #F3F0FF;
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-purple-50 via-teal-50 to-blue-50">
        <Sidebar className="border-r border-purple-100 bg-white/80 backdrop-blur-sm">
          <SidebarHeader className="border-b border-purple-100 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-gray-900">TaskBuddy</h2>
                <p className="text-xs text-purple-600">Your virtual companion</p>
              </div>
            </div>
            
            {/* Points and Level Display */}
            {userProgress && (
              <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-semibold text-gray-700">Level {currentLevel}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    <span className="text-sm font-bold text-purple-600">{userProgress.total_points} pts</span>
                  </div>
                </div>
                {userProgress.current_streak > 0 && (
                  <div className="flex items-center gap-1 text-xs text-orange-600">
                    🔥 <span className="font-semibold">{userProgress.current_streak} day streak!</span>
                  </div>
                )}
              </div>
            )}
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-purple-50 hover:text-purple-700 transition-all duration-300 rounded-xl mb-2 ${
                          location.pathname === item.url ? 'bg-gradient-to-r from-purple-500 to-teal-500 text-white shadow-md' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {currentUser?.companion_type && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                  My Companion
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <div className="mx-3 p-4 bg-gradient-to-br from-purple-100 to-teal-100 rounded-2xl space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                        <span className="text-2xl">
                          {getCompanionEmoji()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">
                          {getCompanionName()}
                        </p>
                        <p className="text-xs text-gray-600">Working with you</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Button
                        onClick={handleChangeCompanion}
                        variant="outline"
                        size="sm"
                        className="w-full bg-white hover:bg-purple-50 border-purple-200 text-purple-700 font-medium"
                      >
                        <RefreshCw className="w-3 h-3 mr-2" />
                        Change Companion
                      </Button>
                      <Button
                        onClick={() => setShowPersonalityModal(true)}
                        variant="outline"
                        size="sm"
                        className="w-full bg-white hover:bg-purple-50 border-purple-200 text-purple-700 font-medium"
                      >
                        <MessageSquare className="w-3 h-3 mr-2" />
                        {getPersonalityLabel()}
                      </Button>
                    </div>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            <div className="mt-6 mx-3 p-4 bg-gradient-to-br from-purple-100 to-teal-100 rounded-2xl">
              <p className="text-sm font-medium text-gray-700 mb-2">💜 Remember</p>
              <p className="text-xs text-gray-600">Progress over perfection. You've got this!</p>
            </div>
          </SidebarContent>

          <SidebarFooter className="border-t border-purple-100 p-4">
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">You</p>
                <p className="text-xs text-gray-500">Doing great today!</p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white/70 backdrop-blur-md border-b border-purple-100 px-6 py-4 md:hidden sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-purple-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">TaskBuddy</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
          </main>
          </div>

          <PersonalitySettingsModal
          open={showPersonalityModal}
          onOpenChange={setShowPersonalityModal}
          currentUser={currentUser}
          onUpdate={refreshUser}
          />
          </SidebarProvider>
          );
          }