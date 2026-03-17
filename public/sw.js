// TaskBuddy Service Worker v2
// Handles push notifications, scheduled alerts, and PWA caching

const CACHE_NAME = 'taskbuddy-v2';
const ICON_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ff06728f59128717455ed3/947e987fc_Screenshot2025-12-08at84335AM.png';

// ─── Install & Activate ───────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ─── Scheduled Notification Store ────────────────────────────────────────────
// Map of timerId -> setTimeout handle (for cancellation)
const scheduledTimers = new Map();

function scheduleNotification(id, delayMs, title, body, options = {}) {
  // Cancel any existing timer with the same id
  if (scheduledTimers.has(id)) {
    clearTimeout(scheduledTimers.get(id));
    scheduledTimers.delete(id);
  }

  if (delayMs <= 0) {
    showNotification(title, body, options);
    return;
  }

  const handle = setTimeout(() => {
    scheduledTimers.delete(id);
    showNotification(title, body, options);
  }, delayMs);

  scheduledTimers.set(id, handle);
}

function cancelScheduledNotification(id) {
  if (scheduledTimers.has(id)) {
    clearTimeout(scheduledTimers.get(id));
    scheduledTimers.delete(id);
  }
}

function showNotification(title, body, options = {}) {
  const opts = {
    body,
    icon: ICON_URL,
    badge: ICON_URL,
    vibrate: options.vibrate || [200, 100, 200],
    tag: options.tag || 'taskbuddy',
    data: options.data || {},
    requireInteraction: options.requireInteraction || false,
    silent: false,
    ...(options.actions ? { actions: options.actions } : {}),
  };

  return self.registration.showNotification(title, opts);
}

// ─── Message Handler (from app) ───────────────────────────────────────────────
self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || !msg.type) return;

  switch (msg.type) {

    // Immediate or delayed notification
    case 'SCHEDULE_NOTIFICATION':
      scheduleNotification(
        msg.id || msg.tag || 'default',
        msg.delay || 0,
        msg.title,
        msg.body,
        {
          tag: msg.tag,
          vibrate: msg.vibrate,
          requireInteraction: msg.requireInteraction,
          actions: msg.actions,
          data: msg.data,
        }
      );
      break;

    // Schedule a session-end notification at a future timestamp
    case 'SCHEDULE_SESSION_END':
      {
        const delay = msg.endsAt - Date.now();
        scheduleNotification('session-end', Math.max(0, delay), msg.title, msg.body, {
          tag: 'session-end',
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 400],
          actions: [
            { action: 'complete', title: '✅ Mark Complete' },
            { action: 'extend', title: '⏱ +5 min' },
          ],
          data: { action: 'session-end', taskId: msg.taskId },
        });
      }
      break;

    // Schedule a break-start notification
    case 'SCHEDULE_BREAK':
      {
        const delay = msg.startsAt - Date.now();
        scheduleNotification('break-start', Math.max(0, delay), '☕ Break Time!', msg.body || 'Time to stretch and recharge.', {
          tag: 'break-start',
          requireInteraction: false,
          vibrate: [300, 100, 300],
          actions: [
            { action: 'start_break', title: '☕ Take Break' },
            { action: 'skip_break', title: '⏩ Skip' },
          ],
          data: { action: 'break-start' },
        });
      }
      break;

    // Schedule a Pomodoro-complete notification
    case 'SCHEDULE_POMODORO_COMPLETE':
      {
        const delay = msg.completesAt - Date.now();
        scheduleNotification('pomodoro', Math.max(0, delay), '🍅 Pomodoro Complete!', msg.body || 'Great focus! Time for a short break.', {
          tag: 'pomodoro',
          requireInteraction: true,
          vibrate: [100, 50, 100, 50, 300],
          actions: [
            { action: 'start_break', title: '☕ Start Break' },
            { action: 'skip_break', title: '⏩ Skip Break' },
          ],
          data: { action: 'pomodoro-complete' },
        });
      }
      break;

    // Schedule encouragement mid-session
    case 'SCHEDULE_ENCOURAGEMENT':
      scheduleNotification(
        `encouragement-${msg.id || Date.now()}`,
        msg.delay || 0,
        msg.title || '💪 Keep Going!',
        msg.body,
        { tag: 'encouragement', requireInteraction: false, vibrate: [100, 50, 100] }
      );
      break;

    // Cancel a scheduled notification
    case 'CANCEL_NOTIFICATION':
      cancelScheduledNotification(msg.id || msg.tag || 'default');
      break;

    // Cancel ALL scheduled notifications (e.g. on session stop)
    case 'CANCEL_ALL':
      scheduledTimers.forEach((handle) => clearTimeout(handle));
      scheduledTimers.clear();
      break;
  }
});

// ─── Notification Click Handler ───────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Find an open tab
      const existing = clients.find((c) => c.url.includes(self.location.origin));

      const navigateTo = action === 'extend' ? '/FocusSession?extend=5' : '/FocusSession';

      if (existing) {
        existing.focus();
        existing.postMessage({ type: 'NOTIFICATION_ACTION', action, data });
      } else {
        self.clients.openWindow(navigateTo);
      }
    })
  );
});

// ─── Push Event (Web Push API — future use) ───────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: 'TaskBuddy', body: event.data.text() }; }
  event.waitUntil(
    showNotification(payload.title || 'TaskBuddy', payload.body || '', payload.options || {})
  );
});
