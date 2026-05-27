import { lazy } from 'react';
import __Layout from './Layout.jsx';

const AITaskGenerator = lazy(() => import('./pages/AITaskGenerator'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Analytics = lazy(() => import('./pages/Analytics'));
const BrainDump = lazy(() => import('./pages/BrainDump'));
const BrainDumpHistory = lazy(() => import('./pages/BrainDumpHistory'));
const CalendarCallback = lazy(() => import('./pages/CalendarCallback'));
const CalendarGapFiller = lazy(() => import('./pages/CalendarGapFiller'));
const CalendarView = lazy(() => import('./pages/CalendarView'));
const CharacterSelection = lazy(() => import('./pages/CharacterSelection'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FocusMode = lazy(() => import('./pages/FocusMode'));
const FocusSession = lazy(() => import('./pages/FocusSession'));
const Goals = lazy(() => import('./pages/Goals'));
const Habits = lazy(() => import('./pages/Habits'));
const Home = lazy(() => import('./pages/Home'));
const Integrations = lazy(() => import('./pages/Integrations'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const SessionHistory = lazy(() => import('./pages/SessionHistory'));
const Settings = lazy(() => import('./pages/Settings'));
const SkillDevelopment = lazy(() => import('./pages/SkillDevelopment'));
const SmartPlan = lazy(() => import('./pages/SmartPlan'));
const Subscription = lazy(() => import('./pages/Subscription'));
const TaskBreakdown = lazy(() => import('./pages/TaskBreakdown'));
const Tasks = lazy(() => import('./pages/Tasks'));
const TeamDashboard = lazy(() => import('./pages/TeamDashboard'));
const TeamFocusSession = lazy(() => import('./pages/TeamFocusSession'));
const Teams = lazy(() => import('./pages/Teams'));
const VoiceTask = lazy(() => import('./pages/VoiceTask'));
const QuickAdd = lazy(() => import('./pages/QuickAdd'));

export const PAGES = {
    "AITaskGenerator": AITaskGenerator,
    "Achievements": Achievements,
    "Analytics": Analytics,
    "BrainDump": BrainDump,
    "BrainDumpHistory": BrainDumpHistory,
    "CalendarCallback": CalendarCallback,
    "CalendarGapFiller": CalendarGapFiller,
    "CalendarView": CalendarView,
    "CharacterSelection": CharacterSelection,
    "Dashboard": Dashboard,
    "FocusMode": FocusMode,
    "FocusSession": FocusSession,
    "Goals": Goals,
    "Habits": Habits,
    "Home": Home,
    "Integrations": Integrations,
    "LeaderboardPage": LeaderboardPage,
    "NotificationSettings": NotificationSettings,
    "Onboarding": Onboarding,
    "SessionHistory": SessionHistory,
    "Settings": Settings,
    "SkillDevelopment": SkillDevelopment,
    "SmartPlan": SmartPlan,
    "Subscription": Subscription,
    "TaskBreakdown": TaskBreakdown,
    "Tasks": Tasks,
    "TeamDashboard": TeamDashboard,
    "TeamFocusSession": TeamFocusSession,
    "Teams": Teams,
    "VoiceTask": VoiceTask,
    "QuickAdd": QuickAdd,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};