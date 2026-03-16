import { useState, useEffect } from "react";
import { Bell, BellOff, Watch, Smartphone, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { requestNotificationPermission } from "./BackgroundTimer";

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

export function sendSWMessage(data) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(data);
  }
}

export function showRichNotification(title, body, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const { tag = 'focus', actions = [], data = {}, requireInteraction = false, vibrate = [200, 100, 200] } = options;

  // Use service worker for rich notifications with actions (better watch support)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    sendSWMessage({
      type: 'SCHEDULE_NOTIFICATION',
      delay: 0,
      title,
      body,
      tag,
      actions,
      data,
    });
  } else {
    // Fallback to basic notification
    try {
      const n = new Notification(title, { body, icon: '/favicon.ico', badge: '/favicon.ico', tag, vibrate, requireInteraction, ...options });
      n.onclick = () => { window.focus(); n.close(); };
      setTimeout(() => n.close(), requireInteraction ? 30000 : 8000);
    } catch {}
  }
}

export default function FocusNotificationSettings({ onPermissionChange }) {
  const [permission, setPermission] = useState(Notification.permission || 'default');
  const [sessionStart, setSessionStart] = useState(true);
  const [pomodoroComplete, setPomodoroComplete] = useState(true);
  const [sessionEnd, setSessionEnd] = useState(true);
  const [breakReminder, setBreakReminder] = useState(true);
  const [encouragements, setEncouragements] = useState(false);

  // Save prefs to localStorage
  useEffect(() => {
    const stored = localStorage.getItem('focus_notification_prefs');
    if (stored) {
      const prefs = JSON.parse(stored);
      setSessionStart(prefs.sessionStart ?? true);
      setPomodoroComplete(prefs.pomodoroComplete ?? true);
      setSessionEnd(prefs.sessionEnd ?? true);
      setBreakReminder(prefs.breakReminder ?? true);
      setEncouragements(prefs.encouragements ?? false);
    }
  }, []);

  const savePrefs = (key, value) => {
    const stored = JSON.parse(localStorage.getItem('focus_notification_prefs') || '{}');
    localStorage.setItem('focus_notification_prefs', JSON.stringify({ ...stored, [key]: value }));
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    const newPermission = granted ? 'granted' : 'denied';
    setPermission(newPermission);
    onPermissionChange?.(granted);

    if (granted) {
      registerServiceWorker();
      showRichNotification('🎯 TaskBuddy Notifications On', 'You\'ll get focus session alerts — including on your smartwatch!', {
        tag: 'test',
        requireInteraction: false,
      });
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
                <Watch className="w-3 h-3" /> Mirrors to Apple Watch & Wear OS
              </p>
            </div>
          </div>
          {permission === 'granted' ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Button size="sm" onClick={handleRequestPermission} className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8">
              Enable
            </Button>
          )}
        </div>

        {permission === 'granted' && (
          <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Notify me when…</p>
            {[
              { label: "Session starts", key: "sessionStart", value: sessionStart, set: setSessionStart },
              { label: "Pomodoro cycle completes 🍅", key: "pomodoroComplete", value: pomodoroComplete, set: setPomodoroComplete },
              { label: "Break time begins ☕", key: "breakReminder", value: breakReminder, set: setBreakReminder },
              { label: "Session ends 🎉", key: "sessionEnd", value: sessionEnd, set: setSessionEnd },
              { label: "Encouragement messages 💪", key: "encouragements", value: encouragements, set: setEncouragements },
            ].map(({ label, key, value, set }) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm text-gray-700 dark:text-gray-300 font-normal">{label}</Label>
                <Switch
                  checked={value}
                  onCheckedChange={(v) => { set(v); savePrefs(key, v); }}
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