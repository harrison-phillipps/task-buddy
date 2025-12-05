import Dashboard from './pages/Dashboard';
import TaskBreakdown from './pages/TaskBreakdown';
import FocusSession from './pages/FocusSession';
import CharacterSelection from './pages/CharacterSelection';
import BrainDump from './pages/BrainDump';
import BrainDumpHistory from './pages/BrainDumpHistory';
import SessionHistory from './pages/SessionHistory';
import Achievements from './pages/Achievements';
import Tasks from './pages/Tasks';
import LeaderboardPage from './pages/LeaderboardPage';
import Analytics from './pages/Analytics';
import Onboarding from './pages/Onboarding';
import CalendarCallback from './pages/CalendarCallback';
import CalendarView from './pages/CalendarView';
import Subscription from './pages/Subscription';
import Journal from './pages/Journal';
import AITaskGenerator from './pages/AITaskGenerator';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "TaskBreakdown": TaskBreakdown,
    "FocusSession": FocusSession,
    "CharacterSelection": CharacterSelection,
    "BrainDump": BrainDump,
    "BrainDumpHistory": BrainDumpHistory,
    "SessionHistory": SessionHistory,
    "Achievements": Achievements,
    "Tasks": Tasks,
    "LeaderboardPage": LeaderboardPage,
    "Analytics": Analytics,
    "Onboarding": Onboarding,
    "CalendarCallback": CalendarCallback,
    "CalendarView": CalendarView,
    "Subscription": Subscription,
    "Journal": Journal,
    "AITaskGenerator": AITaskGenerator,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};