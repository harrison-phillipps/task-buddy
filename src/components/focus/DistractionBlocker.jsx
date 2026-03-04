import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ShieldOff, Plus, X, AlertCircle, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const DEFAULT_DISTRACTIONS = [
  "reddit.com", "twitter.com", "x.com", "facebook.com", "instagram.com",
  "youtube.com", "tiktok.com", "netflix.com", "twitch.tv",
];

const STORAGE_KEY = "focus_blocker_sites";
const ACTIVE_KEY = "focus_blocker_active";

export default function DistractionBlocker({ isSessionActive }) {
  const [isBlocking, setIsBlocking] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) || "false"); } catch { return false; }
  });
  const [blockedSites, setBlockedSites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_DISTRACTIONS; } catch { return DEFAULT_DISTRACTIONS; }
  });
  const [newSite, setNewSite] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blockedSites));
  }, [blockedSites]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(isBlocking));
    if (isBlocking) {
      injectBlocker(blockedSites);
    } else {
      removeBlocker();
    }
  }, [isBlocking, blockedSites]);

  // Auto-enable when session starts
  useEffect(() => {
    if (isSessionActive && !isBlocking) {
      setIsBlocking(true);
    }
  }, [isSessionActive]);

  // The blocker works by showing a warning overlay when user navigates to a blocked domain.
  // In a web app we can intercept link clicks and warn the user, and also
  // use a beforeunload / visibilitychange trick to notice attempted navigation.
  const injectBlocker = (sites) => {
    window.__focusBlockerSites = sites;
    if (!window.__focusBlockerInstalled) {
      window.__focusBlockerInstalled = true;
      document.addEventListener("click", handleLinkClick, true);
    }
  };

  const removeBlocker = () => {
    document.removeEventListener("click", handleLinkClick, true);
    window.__focusBlockerInstalled = false;
  };

  const handleLinkClick = (e) => {
    const link = e.target.closest("a[href]");
    if (!link) return;
    const href = link.href || "";
    const sites = window.__focusBlockerSites || [];
    if (sites.some(s => href.includes(s))) {
      e.preventDefault();
      e.stopPropagation();
      toast.warning("🛡️ Blocked! Stay focused — this site is on your distraction list.", { duration: 3000 });
    }
  };

  const addSite = () => {
    const cleaned = newSite.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
    if (!cleaned) return;
    if (!blockedSites.includes(cleaned)) {
      setBlockedSites(prev => [...prev, cleaned]);
    }
    setNewSite("");
  };

  const removeSite = (site) => setBlockedSites(prev => prev.filter(s => s !== site));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isBlocking ? (
            <Shield className="w-5 h-5 text-green-600" />
          ) : (
            <ShieldOff className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Distraction Blocker</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isBlocking ? `Blocking ${blockedSites.length} sites` : "Blocking disabled"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowInfo(s => !s)} className="text-gray-400 hover:text-gray-600">
            <AlertCircle className="w-4 h-4" />
          </button>
          <Switch checked={isBlocking} onCheckedChange={setIsBlocking} />
        </div>
      </div>

      <AnimatePresence>
        {showInfo && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
              ℹ️ This blocker warns you when you click links to distracting sites within the app. For full OS-level blocking, use a browser extension like <strong>Cold Turkey</strong> or <strong>Freedom</strong>.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add site */}
      <div className="flex gap-2">
        <Input
          value={newSite}
          onChange={e => setNewSite(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addSite()}
          placeholder="e.g. reddit.com"
          className="flex-1 text-sm h-8"
        />
        <Button size="sm" variant="outline" onClick={addSite} className="h-8 px-2">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Site list */}
      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
        {blockedSites.map(site => (
          <Badge
            key={site}
            variant="secondary"
            className={`text-xs flex items-center gap-1 ${isBlocking ? "bg-red-50 text-red-700 border-red-200" : "bg-gray-100 text-gray-600"}`}
          >
            {site}
            <button onClick={() => removeSite(site)} className="ml-0.5 hover:text-red-800">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}