import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles, ListTodo, Play, LayoutDashboard, User, RefreshCw, Brain, Award, Trophy, MessageSquare, Calendar, Users, Target, Settings, PanelLeftClose, PanelLeft, ChevronDown, ChevronUp, Maximize2, Mic } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import React from "react";
import PersonalitySettingsModal from "@/components/PersonalitySettingsModal";
import NotificationBell from "@/components/notifications/NotificationBell";
import DeepPersonalityCustomizer from "@/components/companion/DeepPersonalityCustomizer";
import DevModeIndicator from "@/components/DevModeIndicator";
import ThemeToggle from "@/components/ThemeToggle";

const navigationItems = [
  {
    title: "Home",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "My Tasks",
    url: createPageUrl("Tasks"),
    icon: ListTodo,
  },
  {
    title: "Focus Now",
    url: createPageUrl("FocusSession"),
    icon: Play,
  },
];

const moreItems = [
  {
    title: "Focus Mode",
    url: createPageUrl("FocusMode"),
    icon: Maximize2,
  },
  {
    title: "Voice to Tasks",
    url: createPageUrl("VoiceTask"),
    icon: Mic,
  },
  {
    title: "Brain Dump",
    url: createPageUrl("BrainDump"),
    icon: Brain,
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
    title: "Skill Development",
    url: createPageUrl("SkillDevelopment"),
    icon: Award,
  },
  {
    title: "Calendar",
    url: createPageUrl("CalendarView"),
    icon: Calendar,
  },
  {
    title: "Teams",
    url: createPageUrl("Teams"),
    icon: Users,
  },
  {
    title: "Integrations",
    url: createPageUrl("Integrations"),
    icon: Sparkles,
  },
  {
    title: "Settings",
    url: createPageUrl("Settings"),
    icon: Settings,
  },
];

function LayoutContent({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { setOpenMobile } = useSidebar();
  const [currentUser, setCurrentUser] = React.useState(null);
  const [userProgress, setUserProgress] = React.useState(null);
  const [showPersonalityModal, setShowPersonalityModal] = React.useState(false);
  const [showDeepCustomizer, setShowDeepCustomizer] = React.useState(false);
  const [showMoreMenu, setShowMoreMenu] = React.useState(false);

  // Dark mode detection - handled by ThemeToggle component now

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        // Fetch progress in parallel after we have the user id
        base44.entities.UserProgress.filter({ user_id: user.id }).then(list => {
          setUserProgress(list.length > 0 ? list[0] : null);
        }).catch(() => setUserProgress(null));
      } catch (error) {
        console.error("Error fetching user or user progress:", error);
        setCurrentUser(null);
        setUserProgress(null);
      }
    };
    fetchUser();
  }, [location.pathname]);

  const handleChangeCompanion = () => {
    navigate(createPageUrl("CharacterSelection"));
  };

  const getCompanionEmoji = () => {
    if (currentUser?.companion_type === 'cat') return '🐱';
    if (currentUser?.companion_type === 'dog') return '🐶';
    if (currentUser?.companion_type === 'orb') return '🔮';
    if (currentUser?.companion_type === 'robot') return '🤖';
    return '🤖';
  };

  const getCompanionName = () => {
    if (currentUser?.companion_type === 'cat') return 'Cozy Cat';
    if (currentUser?.companion_type === 'dog') return 'Playful Dog';
    if (currentUser?.companion_type === 'orb') return 'Magic Orb';
    if (currentUser?.companion_type === 'robot') return 'Friendly Robot';
    return 'Friendly Robot';
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

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  return (
    <>
      <style>{`
        :root {
          --primary-purple: #8B5CF6;
          --primary-teal: #14B8A6;
          --accent-coral: #FB7185;
          --warm-bg: #FAF9F7;
          --soft-purple: #F3F0FF;
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-purple-50 via-teal-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-x-hidden">
        <Sidebar className="border-r border-purple-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <SidebarHeader className="border-b border-purple-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ff06728f59128717455ed3/947e987fc_Screenshot2025-12-08at84335AM.png" 
                alt="TaskBuddy Logo" 
                className="w-10 h-10 rounded-2xl shadow-lg object-cover"
              />
              <div>
                <h2 className="font-bold text-xl text-gray-900 dark:text-gray-100">TaskBuddy</h2>
                <p className="text-xs text-purple-600 dark:text-purple-400">Your virtual companion</p>
              </div>
            </div>
            
            {/* Points and Level Display */}
            {userProgress && (
              <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-xl border border-yellow-200 dark:border-yellow-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Level {currentLevel}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-500 dark:text-purple-400" />
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{userProgress.total_points} pts</span>
                  </div>
                </div>
                {userProgress.current_streak > 0 && (
                  <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                    🔥 <span className="font-semibold">{userProgress.current_streak} day streak!</span>
                  </div>
                )}
              </div>
            )}
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
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
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-4" onClick={handleNavClick}>
                          <item.icon className="w-6 h-6" />
                          <span className="font-semibold text-base">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupContent>
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="w-full flex items-center justify-between px-4 py-2 text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors"
                >
                  <span className="font-medium text-sm">More Tools</span>
                  {showMoreMenu ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showMoreMenu && (
                  <SidebarMenu className="mt-2">
                    {moreItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`hover:bg-purple-50 hover:text-purple-700 transition-all duration-300 rounded-xl mb-1 ${
                            location.pathname === item.url ? 'bg-purple-100 text-purple-700' : ''
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-4 py-2 text-sm" onClick={handleNavClick}>
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                )}
              </SidebarGroupContent>
            </SidebarGroup>

            {currentUser?.companion_type && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-2">
                  My Companion
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <div className="mx-3 p-4 bg-gradient-to-br from-purple-100 to-teal-100 dark:from-purple-900/30 dark:to-teal-900/30 rounded-2xl space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-md">
                        <span className="text-2xl">
                          {getCompanionEmoji()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                          {getCompanionName()}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Working with you</p>
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
                      <Button
                        onClick={() => setShowDeepCustomizer(true)}
                        variant="outline"
                        size="sm"
                        className="w-full bg-white hover:bg-purple-50 border-purple-200 text-purple-700 font-medium"
                      >
                        <Sparkles className="w-3 h-3 mr-2" />
                        Deep Customize
                      </Button>
                    </div>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            <div className="mt-6 mx-3 p-4 bg-gradient-to-br from-purple-100 to-teal-100 dark:from-purple-900/30 dark:to-teal-900/30 rounded-2xl">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">💜 Remember</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Progress over perfection. You've got this!</p>
            </div>
          </SidebarContent>

          <SidebarFooter className="border-t border-purple-100 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">You</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Doing great today!</p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border-b border-purple-100 dark:border-gray-700 px-3 sm:px-6 py-4 sticky top-0 z-10">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-4">
                <SidebarTrigger className="hover:bg-purple-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors duration-200">
                  <PanelLeft className="w-5 h-5 dark:text-gray-200" />
                </SidebarTrigger>
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 dark:from-purple-400 dark:to-teal-400 bg-clip-text text-transparent md:hidden">TaskBuddy</h1>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
                <NotificationBell currentUser={currentUser} />
              </div>
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
          
          <DeepPersonalityCustomizer
          open={showDeepCustomizer}
          onOpenChange={setShowDeepCustomizer}
          currentUser={currentUser}
          onUpdate={refreshUser}
          />

          <DevModeIndicator />
          </>
          );
          }

          export default function Layout({ children, currentPageName }) {
          return (
          <SidebarProvider>
          <LayoutContent children={children} currentPageName={currentPageName} />
          </SidebarProvider>
          );
          }