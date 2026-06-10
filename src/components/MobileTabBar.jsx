import { useLocation, useNavigate, Link } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard, ListTodo, Play, Target, MoreHorizontal,
  Brain, Settings, Calendar, Users, Award, Zap, X, Plus,
  Sparkles, Flame, Mic, CalendarDays, GripVertical, Check, Pencil
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

// All available pages users can pick
export const ALL_TABS = [
  { key: "Dashboard",         title: "Home",       icon: LayoutDashboard },
  { key: "Tasks",             title: "Tasks",      icon: ListTodo },
  { key: "FocusSession",      title: "Focus",      icon: Play },
  { key: "Goals",             title: "Goals",      icon: Target },
  { key: "Habits",            title: "Habits",     icon: Flame },
  { key: "BrainDump",         title: "Brain Dump", icon: Brain },
  { key: "CalendarView",      title: "Calendar",   icon: Calendar },
  { key: "Teams",             title: "Teams",      icon: Users },
  { key: "Achievements",      title: "Awards",     icon: Award },
  { key: "CalendarGapFiller", title: "Gap Filler", icon: Zap },
  { key: "CharacterSelection",title: "Companion",  icon: Sparkles },
  { key: "VoiceTask",         title: "Voice",      icon: Mic },
  { key: "SmartPlan",         title: "Smart Plan", icon: CalendarDays },
  { key: "Settings",          title: "Settings",   icon: Settings },
];

const DEFAULT_KEYS = ["Dashboard", "Tasks", "FocusSession", "Goals"];
const STORAGE_KEY = "tb_custom_tabs";

function loadSavedKeys() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_KEYS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 4) return parsed;
  } catch {}
  return DEFAULT_KEYS;
}

export default function MobileTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isClinician, setIsClinician] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(loadSavedKeys);
  const [pendingKeys, setPendingKeys] = useState(loadSavedKeys);
  const scrollPositions = useRef({});
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user) {
        base44.entities.ClinicianProfile.filter({ user_id: user.id })
          .then(list => setIsClinician(list.length > 0))
          .catch(() => setIsClinician(false));
      }
    }).catch(() => {});
  }, []);

  const activeTabs = selectedKeys
    .map(k => ALL_TABS.find(t => t.key === k))
    .filter(Boolean);

  const tabHistory = useRef(
    Object.fromEntries(activeTabs.map(t => [t.key, t.key === "Dashboard" && isClinician ? createPageUrl("ClinicianDashboard") : createPageUrl(t.key)]))
  );

  useEffect(() => {
    const incoming = location.pathname;
    const outgoing = prevPath.current;
    if (outgoing !== incoming) {
      scrollPositions.current[outgoing] = window.scrollY;
      const ownerTab = activeTabs.find(t => {
        const url = createPageUrl(t.key);
        return incoming === url || incoming.startsWith(url + '/');
      });
      if (ownerTab) tabHistory.current[ownerTab.key] = incoming;
      const saved = scrollPositions.current[incoming] ?? 0;
      requestAnimationFrame(() => window.scrollTo(0, saved));
      prevPath.current = incoming;
    }
  }, [location.pathname]);

  const openEdit = () => {
    setPendingKeys([...selectedKeys]);
    setShowMore(false);
    setEditMode(true);
  };

  const saveEdit = () => {
    setSelectedKeys(pendingKeys);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingKeys));
    setEditMode(false);
  };

  const cancelEdit = () => {
    setPendingKeys([...selectedKeys]);
    setEditMode(false);
  };

  const togglePending = (key) => {
    if (pendingKeys.includes(key)) {
      if (pendingKeys.length > 1) setPendingKeys(pendingKeys.filter(k => k !== key));
    } else {
      if (pendingKeys.length < 4) setPendingKeys([...pendingKeys, key]);
    }
  };

  // Tabs not in selected (shown in more drawer)
  const moreTabs = ALL_TABS.filter(t => !selectedKeys.includes(t.key));

  return (
    <>
      {/* Overlay */}
      {(showMore || editMode) && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => { setShowMore(false); if (editMode) cancelEdit(); }}
        />
      )}

      {/* More / Edit drawer */}
      <div
        className={cn(
          "fixed bottom-[56px] left-0 right-0 z-50 md:hidden bg-white dark:bg-gray-900 border-t border-purple-100 dark:border-gray-700 rounded-t-2xl shadow-2xl transition-transform duration-300",
          (showMore || editMode) ? "translate-y-0" : "translate-y-full pointer-events-none"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="font-semibold text-gray-800 dark:text-gray-100 text-base">
            {editMode ? "Customise Tab Bar" : "More"}
          </span>
          <div className="flex items-center gap-2">
            {!editMode && (
              <button
                onClick={openEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-medium"
              >
                <Pencil className="w-3.5 h-3.5" />
                Customise
              </button>
            )}
            <button
              onClick={() => { setShowMore(false); cancelEdit(); }}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {editMode ? (
          /* Edit mode — pick up to 4 tabs */
          <div className="px-4 pb-6">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Select up to 4 items for your tab bar. Tap to add or remove.
            </p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {ALL_TABS.map(tab => {
                const selected = pendingKeys.includes(tab.key);
                const atMax = pendingKeys.length >= 4 && !selected;
                return (
                  <button
                    key={tab.key}
                    onClick={() => togglePending(tab.key)}
                    disabled={atMax}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-all border-2 relative",
                      selected
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                        : atMax
                          ? "border-transparent bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600"
                          : "border-transparent bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-purple-300"
                    )}
                  >
                    {selected && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                    <tab.icon className="w-5 h-5" />
                    {tab.title}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={cancelEdit}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={pendingKeys.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-teal-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                Save ({pendingKeys.length}/4)
              </button>
            </div>
          </div>
        ) : (
          /* More grid — pages not in tab bar */
          <div className="grid grid-cols-3 gap-3 px-4 pb-6">
            {moreTabs.map((tab) => {
              const url = tab.key === "Dashboard" && isClinician ? createPageUrl("ClinicianDashboard") : createPageUrl(tab.key);
              const active = location.pathname === url;
              return (
                <Link
                  key={tab.key}
                  to={url}
                  onClick={() => setShowMore(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-colors",
                    active
                      ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <tab.icon className="w-6 h-6" />
                  {tab.title}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <nav className="mobile-tab-bar fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-purple-100 dark:border-gray-700 flex md:hidden">
        {/* First 2 tabs */}
        {activeTabs.slice(0, 2).map(tab => {
          const url = tab.key === "Dashboard" && isClinician ? createPageUrl("ClinicianDashboard") : createPageUrl(tab.key);
          const active = location.pathname === url || location.pathname.startsWith(url + '/');
          return (
            <button
              key={tab.key}
              onClick={() => {
                if (active) { navigate(url, { replace: true }); }
                else { navigate(tabHistory.current[tab.key] || url); }
              }}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors min-h-[56px]",
                active ? "text-purple-600 dark:text-purple-400" : "text-gray-500 dark:text-gray-400"
              )}
              style={{ marginBottom: "env(safe-area-inset-bottom)" }}
            >
              <tab.icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
              <span>{tab.title}</span>
            </button>
          );
        })}

        {/* Center Quick Add */}
        <div className="flex-1 flex items-center justify-center" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
          <button
            onClick={() => navigate(createPageUrl("QuickAdd"))}
            className="w-14 h-14 -mt-5 bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          >
            <Plus className="w-7 h-7 text-white stroke-[2.5]" />
          </button>
        </div>

        {/* Last 2 tabs */}
        {activeTabs.slice(2, 4).map(tab => {
          const url = tab.key === "Dashboard" && isClinician ? createPageUrl("ClinicianDashboard") : createPageUrl(tab.key);
          const active = location.pathname === url || location.pathname.startsWith(url + '/');
          return (
            <button
              key={tab.key}
              onClick={() => {
                if (active) { navigate(url, { replace: true }); }
                else { navigate(tabHistory.current[tab.key] || url); }
              }}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors min-h-[56px]",
                active ? "text-purple-600 dark:text-purple-400" : "text-gray-500 dark:text-gray-400"
              )}
              style={{ marginBottom: "env(safe-area-inset-bottom)" }}
            >
              <tab.icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
              <span>{tab.title}</span>
            </button>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setShowMore(prev => !prev)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors min-h-[56px]",
            showMore ? "text-purple-600 dark:text-purple-400" : "text-gray-500 dark:text-gray-400"
          )}
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <MoreHorizontal className={cn("w-5 h-5", showMore && "stroke-[2.5]")} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}