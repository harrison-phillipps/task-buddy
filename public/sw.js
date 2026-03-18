// TaskBuddy Service Worker — handles scheduled focus notifications
// These fire even when the tab is backgrounded, and mirror to Apple Watch / Wear OS

const PENDING = new Map(); // id → timeoutId

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// ── Message handler ──────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || !msg.type) return;

  switch (msg.type) {

    // Immediate or delayed notification
    case 'SCHEDULE_NOTIFICATION': {
      const delay = msg.delay || 0;
      clearExisting(msg.id || msg.tag || 'focus');
      const tid = setTimeout(() => {
        fireNotification(msg.title, msg.body, {
          tag: msg.tag || 'focus',
          vibrate: msg.vibrate || [200, 100, 200],
          requireInteraction: msg.requireInteraction || false,
          actions: msg.actions || [],
          data: msg.data || {},
        });
      }, delay);
      PENDING.set(msg.id || msg.tag || 'focus', tid);
      break;
    }

    // Session-end notification at exact timestamp
    case 'SCHEDULE_SESSION_END': {
      clearExisting('session-end');
      const delay = Math.max(0, (msg.endsAt || 0) - Date.now());
      const tid = setTimeout(() => {
        fireNotification(msg.title || '⏱ Session Complete!', msg.body || 'Great work — session finished!', {
          tag: 'session-end',
          vibrate: [200, 100, 200, 100, 400],
          requireInteraction: true,
          actions: [
            { action: 'mark_done', title: '✅ Mark Complete' },
            { action: 'more_time', title: '⏰ +5 min' },
          ],
          data: { taskId: msg.taskId, url: '/FocusSession' },
        });
      }, delay);
      PENDING.set('session-end', tid);
      break;
    }

    // Break-start notification at exact timestamp
    case 'SCHEDULE_BREAK': {
      clearExisting('break-start');
      const delay = Math.max(0, (msg.startsAt || 0) - Date.now());
      const tid = setTimeout(() => {
        fireNotification('Break Time! ☕', msg.body || 'Stretch, hydrate, or just breathe.', {
          tag: 'break-start',
          vibrate: [300, 150, 300],
          requireInteraction: true,
          actions: [
            { action: 'start_break', title: '☕ Start Break' },
            { action: 'skip_break', title: '⏩ Skip Break' },
          ],
          data: { url: '/FocusSession' },
        });
      }, delay);
      PENDING.set('break-start', tid);
      break;
    }

    // Pomodoro-cycle-complete notification at exact timestamp
    case 'SCHEDULE_POMODORO_COMPLETE': {
      clearExisting('pomodoro');
      const delay = Math.max(0, (msg.completesAt || 0) - Date.now());
      const tid = setTimeout(() => {
        fireNotification('Pomodoro Complete! 🍅', msg.body || 'Time for a break! Great work.', {
          tag: 'pomodoro',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          actions: [
            { action: 'start_break', title: '☕ Start Break' },
            { action: 'skip_break', title: '⏩ Skip Break' },
          ],
          data: { url: '/FocusSession' },
        });
      }, delay);
      PENDING.set('pomodoro', tid);
      break;
    }

    // Encouragement notification at exact timestamp
    case 'SCHEDULE_ENCOURAGEMENT': {
      clearExisting('encouragement');
      const delay = Math.max(0, (msg.endsAt || 0) - Date.now());
      const tid = setTimeout(() => {
        fireNotification('Keep Going! 💪', msg.body || "You're doing amazing!", {
          tag: 'encouragement',
          vibrate: [100, 50, 100],
          requireInteraction: false,
          data: { url: '/FocusSession' },
        });
      }, delay);
      PENDING.set('encouragement', tid);
      break;
    }

    case 'CANCEL_NOTIFICATION': {
      clearExisting(msg.id);
      break;
    }

    case 'CANCEL_ALL': {
      for (const tid of PENDING.values()) clearTimeout(tid);
      PENDING.clear();
      break;
    }
  }
});

// ── Notification click — open/focus the app ──────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  const data = event.notification.data || {};
  const targetUrl = data.url || '/FocusSession';

  // Post the action back to any open clients
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (action) {
        clients.forEach(c => c.postMessage({ type: 'NOTIFICATION_ACTION', action, data }));
      }
      const focused = clients.find(c => c.url.includes(targetUrl) && 'focus' in c);
      if (focused) return focused.focus();
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function clearExisting(id) {
  if (PENDING.has(id)) {
    clearTimeout(PENDING.get(id));
    PENDING.delete(id);
  }
}

async function fireNotification(title, body, options = {}) {
  if (self.registration.showNotification) {
    await self.registration.showNotification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: options.tag || 'focus',
      vibrate: options.vibrate || [200, 100, 200],
      requireInteraction: options.requireInteraction || false,
      actions: options.actions || [],
      data: options.data || {},
    });
  }
}
