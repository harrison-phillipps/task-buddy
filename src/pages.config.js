import __Layout from './Layout.jsx';

import AITaskGenerator from './pages/AITaskGenerator';
import Achievements from './pages/Achievements';
import Analytics from './pages/Analytics';
import BrainDump from './pages/BrainDump';
import BrainDumpHistory from './pages/BrainDumpHistory';
import CalendarCallback from './pages/CalendarCallback';
import CalendarGapFiller from './pages/CalendarGapFiller';
import CalendarView from './pages/CalendarView';
import CharacterSelection from './pages/CharacterSelection';
import Dashboard from './pages/Dashboard';
import FocusMode from './pages/FocusMode';
import FocusSession from './pages/FocusSession';
import Goals from './pages/Goals';
import Habits from './pages/Habits';
import Home from './pages/Home';
import Integrations from './pages/Integrations';
import LeaderboardPage from './pages/LeaderboardPage';
import NotificationSettings from './pages/NotificationSettings';
import Onboarding from './pages/Onboarding';
import SessionHistory from './pages/SessionHistory';
import Settings from './pages/Settings';
import SkillDevelopment from './pages/SkillDevelopment';
import SmartPlan from './pages/SmartPlan';
import Subscription from './pages/Subscription';
import TaskBreakdown from './pages/TaskBreakdown';
import Tasks from './pages/Tasks';
import TeamDashboard from './pages/TeamDashboard';
import TeamFocusSession from './pages/TeamFocusSession';
import Teams from './pages/Teams';
import VoiceTask from './pages/VoiceTask';
import QuickAdd from './pages/QuickAdd';
import GuestSession from './pages/GuestSession';
import GuestWelcome from './pages/GuestWelcome';

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