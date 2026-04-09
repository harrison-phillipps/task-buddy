import { useLocation, useNavigate, Link } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import { LayoutDashboard, ListTodo, Play, Target, MoreHorizontal, Brain, Settings, Calendar, Users, Award, Zap, X } from "lucide-react";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

const tabs = [
  { title: "Home", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { title: "Tasks", url: createPageUrl("Tasks"), icon: ListTodo },
  { title: "Focus", url: createPageUrl("FocusSession"), icon: Play },
  { title: "Goals", url: createPageUrl("Goals"), icon: Target },
];

const moreLinks = [
  { title: "Brain Dump", url: createPageUrl("BrainDump"), icon: Brain },
  { title: "Calendar", url: createPageUrl("CalendarView"), icon: Calendar },
  { title: "Teams", url: createPageUrl("Teams"), icon: Users },
  { title: "Achievements", url: createPageUrl("Achievements"), icon: Award },
  { title: "Gap Filler", url: createPageUrl("CalendarGapFiller"), icon: Zap },
  { title: "Settings", url: createPageUrl("Settings"), icon: Settings },
];

export default function MobileTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);
  const scrollPositions = useRef({});
  const prevPath = useRef(location.pathname);
  // Store the last visited URL for each tab root
  const tabHistory = useRef(Object.fromEntries(tabs.map(t => [t.url, t.url])));

  // Track last URL per tab and save/restore scroll
  useEffect(() => {
    const incoming = location.pathname;
    const outgoing = prevPath.current;
    if (outgoing !== incoming) {
      scrollPositions.current[outgoing] = window.scrollY;
      // Update tab history: find which tab root owns this path
      const ownerTab = tabs.find(t => incoming === t.url || incoming.startsWith(t.url + '/'));
      if (ownerTab) tabHistory.current[ownerTab.url] = incoming;
      const saved = scrollPositions.current[incoming] ?? 0;
      requestAnimationFrame(() => window.scrollTo(0, saved));
      prevPath.current = incoming;
    }
  }, [location.pathname]);

  return (
    <>
      {/* More drawer overlay */}
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setShowMore(false)}
        />
      )}
      {/* More drawer */}
      <div
        className={cn(
          "fixed bottom-[56px] left-0 right-0 z-50 md:hidden bg-white dark:bg-gray-900 border-t border-purple-100 dark:border-gray-700 rounded-t-2xl shadow-2xl transition-transform duration-300",
          showMore ? "translate-y-0" : "translate-y-full pointer-events-none"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="font-semibold text-gray-800 dark:text-gray-100 text-base">More</span>
          <button onClick={() => setShowMore(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 px-4 pb-6">
          {moreLinks.map((link) => {
            const active = location.pathname === link.url;
            return (
              <Link
                key={link.title}
                to={link.url}
                onClick={() => setShowMore(false)}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-colors",
                  active
                    ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <link.icon className="w-6 h-6" />
                {link.title}
              </Link>
            );
          })}
        </div>
      </div>

      <nav className="mobile-tab-bar fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-purple-100 dark:border-gray-700 flex md:hidden">
        {tabs.map((tab) => {
          const active = location.pathname === tab.url || location.pathname.startsWith(tab.url + '/');
          return (
            <button
              key={tab.title}
              onClick={() => {
                if (active) {
                  tabHistory.current[tab.url] = tab.url;
                  navigate(tab.url, { replace: true });
                } else {
                  const dest = tabHistory.current[tab.url] || tab.url;
                  navigate(dest);
                }
              }}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors min-h-[56px]",
                active
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-purple-500"
              )}
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
            showMore
              ? "text-purple-600 dark:text-purple-400"
              : "text-gray-500 dark:text-gray-400 hover:text-purple-500"
          )}
        >
          <MoreHorizontal className={cn("w-5 h-5", showMore && "stroke-[2.5]")} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}