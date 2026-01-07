import AITaskGenerator from './pages/AITaskGenerator';
import Achievements from './pages/Achievements';
import Analytics from './pages/Analytics';
import BrainDump from './pages/BrainDump';
import BrainDumpHistory from './pages/BrainDumpHistory';
import CalendarCallback from './pages/CalendarCallback';
import CalendarView from './pages/CalendarView';
import CharacterSelection from './pages/CharacterSelection';
import Dashboard from './pages/Dashboard';
import FocusSession from './pages/FocusSession';
import Goals from './pages/Goals';
import Habits from './pages/Habits';
import Home from './pages/Home';
import Journal from './pages/Journal';
import LeaderboardPage from './pages/LeaderboardPage';
import NotificationSettings from './pages/NotificationSettings';
import Onboarding from './pages/Onboarding';
import SessionHistory from './pages/SessionHistory';
import Settings from './pages/Settings';
import Subscription from './pages/Subscription';
import TaskBreakdown from './pages/TaskBreakdown';
import Tasks from './pages/Tasks';
import TeamDashboard from './pages/TeamDashboard';
import Teams from './pages/Teams';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AITaskGenerator": AITaskGenerator,
    "Achievements": Achievements,
    "Analytics": Analytics,
    "BrainDump": BrainDump,
    "BrainDumpHistory": BrainDumpHistory,
    "CalendarCallback": CalendarCallback,
    "CalendarView": CalendarView,
    "CharacterSelection": CharacterSelection,
    "Dashboard": Dashboard,
    "FocusSession": FocusSession,
    "Goals": Goals,
    "Habits": Habits,
    "Home": Home,
    "Journal": Journal,
    "LeaderboardPage": LeaderboardPage,
    "NotificationSettings": NotificationSettings,
    "Onboarding": Onboarding,
    "SessionHistory": SessionHistory,
    "Settings": Settings,
    "Subscription": Subscription,
    "TaskBreakdown": TaskBreakdown,
    "Tasks": Tasks,
    "TeamDashboard": TeamDashboard,
    "Teams": Teams,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};