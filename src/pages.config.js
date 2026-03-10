/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AITaskGenerator from './pages/AITaskGenerator';
import Achievements from './pages/Achievements';
import Analytics from './pages/Analytics';
import BrainDump from './pages/BrainDump';
import BrainDumpHistory from './pages/BrainDumpHistory';
import CalendarCallback from './pages/CalendarCallback';
import CalendarView from './pages/CalendarView';
import CharacterSelection from './pages/CharacterSelection';
import Dashboard from './pages/Dashboard';
import FocusMode from './pages/FocusMode';
import FocusSession from './pages/FocusSession';
import Goals from './pages/Goals';
import Home from './pages/Home';
import Integrations from './pages/Integrations';
import LeaderboardPage from './pages/LeaderboardPage';
import NotificationSettings from './pages/NotificationSettings';
import Onboarding from './pages/Onboarding';
import SessionHistory from './pages/SessionHistory';
import Settings from './pages/Settings';
import SkillDevelopment from './pages/SkillDevelopment';
import Subscription from './pages/Subscription';
import TaskBreakdown from './pages/TaskBreakdown';
import Tasks from './pages/Tasks';
import TeamDashboard from './pages/TeamDashboard';
import TeamFocusSession from './pages/TeamFocusSession';
import Teams from './pages/Teams';
import VoiceTask from './pages/VoiceTask';
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
    "FocusMode": FocusMode,
    "FocusSession": FocusSession,
    "Goals": Goals,
    "Home": Home,
    "Integrations": Integrations,
    "LeaderboardPage": LeaderboardPage,
    "NotificationSettings": NotificationSettings,
    "Onboarding": Onboarding,
    "SessionHistory": SessionHistory,
    "Settings": Settings,
    "SkillDevelopment": SkillDevelopment,
    "Subscription": Subscription,
    "TaskBreakdown": TaskBreakdown,
    "Tasks": Tasks,
    "TeamDashboard": TeamDashboard,
    "TeamFocusSession": TeamFocusSession,
    "Teams": Teams,
    "VoiceTask": VoiceTask,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};