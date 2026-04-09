import { useLocation, useNavigate } from "react-router-dom";
import { useRef, useEffect } from "react";
import { LayoutDashboard, ListTodo, Play, Target } from "lucide-react";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

const tabs = [
  { title: "Home", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { title: "Tasks", url: createPageUrl("Tasks"), icon: ListTodo },
  { title: "Focus", url: createPageUrl("FocusSession"), icon: Play },
  { title: "Goals", url: createPageUrl("Goals"), icon: Target },
];

export default function MobileTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
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
    <nav className="mobile-tab-bar fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-purple-100 dark:border-gray-700 flex md:hidden">
      {tabs.map((tab) => {
        const active = location.pathname === tab.url || location.pathname.startsWith(tab.url + '/');
        return (
          <button
            key={tab.title}
            onClick={() => {
              if (active) {
                // Reset this tab to its root
                tabHistory.current[tab.url] = tab.url;
                navigate(tab.url, { replace: true });
              } else {
                // Go to last visited page in this tab
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
    </nav>
  );
}