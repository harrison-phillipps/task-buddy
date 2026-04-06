import { useState, useEffect } from "react";
import { Bell, Watch, Smartphone, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { requestNotificationPermission } from "./BackgroundTimer";

// ─── Service Worker Registration ─────────────────────────────────────────────

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
    // Force the waiting SW to activate immediately if an update is found
    if (reg.waiting) {
      reg.waiting.postMessage({ type: '__CLAIM__' });
    }
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: '__CLAIM__' });
          }
        });
      }
    });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (e) {
    console.warn('SW registration failed:', e);
    return null;
  }
}

// Keep the SW alive during an active focus session by pinging it periodically
let _keepAliveInterval = null;

export function startSWKeepAlive() {
  if (_keepAliveInterval) return;
  _keepAliveInterval = setInterval(() => {
    sendSWMessage({ type: 'KEEP_ALIVE' });
  }, 20000); // every 20 seconds
}

export function stopSWKeepAlive() {
  if (_keepAliveInterval) {
    clearInterval(_keepAliveInterval);
    _keepAliveInterval = null;
  }
}

// ─── Send message to active SW ───────────────────────────────────────────────

export async function sendSWMessage(data) {
  if (!('serviceWorker' in navigator)) return;

  // Always wait for ready first — this resolves immediately if already active
  const reg = await navigator.serviceWorker.ready;

  // controller is the SW actually controlling this page
  // active is the SW that is installed (may not control yet on first load)
  const target = navigator.serviceWorker.controller || reg.active;

  if (target) {
    target.postMessage(data);
  } else {
    // SW installed but not yet controlling — claim it, then send
    reg.active?.postMessage({ type: '__CLAIM__' });
    // Re-try once after a short delay to let claim complete
    setTimeout(() => {
      const t = navigator.serviceWorker.controller || reg.active;
      if (t) t.postMessage(data);
    }, 300);
  }
}

// ─── Rich notification via SW (with fallback) ────────────────────────────────

export async function showRichNotification(title, body, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  // Primary: use SW registration.showNotification() — this is what mirrors to Apple Watch / Wear OS
  // and works even when the page is hidden.
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: options.tag || 'focus',
        vibrate: options.vibrate || [200, 100, 200],
        requireInteraction: options.requireInteraction || false,
        actions: options.actions || [],
        data: options.data || {},
        silent: false,
        renotify: true,
      });
      return;
    }
  } catch (_) {}

  // Fallback: post to SW message channel (for scheduled future notifications)
  sendSWMessage({
    type: 'SCHEDULE_NOTIFICATION',
    id: options.tag || 'focus',
    delay: options.delay || 0,
    title,
    body,
    tag: options.tag || 'focus',
    vibrate: options.vibrate || [200, 100, 200],
    requireInteraction: options.requireInteraction || false,
    actions: options.actions || [],
    data: options.data || {},
  });
}

// ─── Schedule a notification at a future timestamp ───────────────────────────

export function scheduleNotificationAt(type, endsAt, extras = {}) {
  sendSWMessage({ type, endsAt, startsAt: endsAt, completesAt: endsAt, ...extras });
}

export function cancelNotification(id) {
  sendSWMessage({ type: 'CANCEL_NOTIFICATION', id });
}

export function cancelAllNotifications() {
  sendSWMessage({ type: 'CANCEL_ALL' });
}

// ─── Notification Preferences ─────────────────────────────────────────────────

const PREFS_KEY = 'focus_notification_prefs';
const DEFAULT_PREFS = {
  sessionStart: true,
  pomodoroComplete: true,
  breakReminder: true,
  sessionEnd: true,
  encouragements: false,
};

export function getNotifPrefs() {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? { ...DEFAULT_PREFS, ...JSON.parse(stored) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function saveNotifPref(key, value) {
  const current = getNotifPrefs();
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, [key]: value }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FocusNotificationSettings({ onPermissionChange }) {
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [prefs, setPrefs] = useState(getNotifPrefs);

  // Keep prefs in sync with localStorage
  const updatePref = (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveNotifPref(key, value);
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    const newPerm = granted ? 'granted' : 'denied';
    setPermission(newPerm);
    onPermissionChange?.(granted);

    if (granted) {
      await registerServiceWorker();
      // Send a test notification to confirm it works
      setTimeout(() => {
        showRichNotification(
          '🎯 TaskBuddy Notifications Active',
          'Focus alerts will appear here — including on your smartwatch!',
          { tag: 'test', requireInteraction: false }
        );
      }, 500);
    }
  };

  if (permission === 'denied') {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">Notifications blocked</p>
          <p className="text-xs text-red-600 dark:text-red-500 mt-1">
            Enable notifications in your browser settings to receive focus alerts on your smartwatch.
          </p>
        </div>
      </div>
    );
  }

  const items = [
    { label: "Session starts 🎯", key: "sessionStart" },
    { label: "Pomodoro cycle completes 🍅", key: "pomodoroComplete" },
    { label: "Break time begins ☕", key: "breakReminder" },
    { label: "Session ends 🎉", key: "sessionEnd" },
    { label: "Encouragement messages 💪", key: "encouragements" },
  ];

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-purple-100 dark:border-gray-700 overflow-hidden shadow-sm">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center">
              <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">Focus Notifications</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Watch className="w-3 h-3" /> Mirrors to Apple Watch &amp; Wear OS
              </p>
            </div>
          </div>
          {permission === 'granted' ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Button
              size="sm"
              onClick={handleRequestPermission}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8"
            >
              Enable
            </Button>
          )}
        </div>

        {permission === 'granted' && (
          <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Notify me when…
            </p>
            {items.map(({ label, key }) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm text-gray-700 dark:text-gray-300 font-normal">{label}</Label>
                <Switch
                  checked={prefs[key]}
                  onCheckedChange={(v) => updatePref(key, v)}
                />
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2 text-xs text-gray-400 dark:text-gray-500">
              <Smartphone className="w-3 h-3" />
              <span>Keep the browser open for background alerts</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}