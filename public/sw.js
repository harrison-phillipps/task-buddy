// TaskBuddy Service Worker — handles scheduled focus notifications
// Persists pending notifications in IndexedDB so they survive SW restarts

const DB_NAME = 'taskbuddy-sw';
const STORE = 'pending';
const PENDING = new Map(); // id → timeoutId (in-memory, rebuilt on activate)

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function savePending(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(item);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function removePending(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllPending() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function clearAllPending() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

self.addEventListener('install', (e) => {
  // Skip waiting so the new SW activates immediately without needing a page refresh
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Claim all open clients immediately — no page reload needed
  e.waitUntil(
    self.clients.claim().then(() => restoreFromDB())
  );
});

// On SW restart, reload all persisted items and re-schedule them
async function restoreFromDB() {
  const items = await getAllPending();
  const now = Date.now();
  for (const item of items) {
    if (item.fireAt < now - 60000) {
      // More than 1 min stale — drop it
      await removePending(item.id);
      continue;
    }
    const delay = Math.max(0, item.fireAt - now);
    scheduleTimeout(item, delay);
  }
}

// ── Core scheduler ────────────────────────────────────────────────────────────

function scheduleTimeout(item, delay) {
  clearExisting(item.id);
  const tid = setTimeout(async () => {
    await fireNotification(item.title, item.body, item.options);
    PENDING.delete(item.id);
    await removePending(item.id);
  }, delay);
  PENDING.set(item.id, tid);
}

async function schedule(id, fireAt, title, body, options = {}) {
  const item = { id, fireAt, title, body, options };
  await savePending(item);
  const delay = Math.max(0, fireAt - Date.now());
  scheduleTimeout(item, delay);
}

// ── Message handler ───────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || !msg.type) return;

  // Allow pages to force immediate activation
  if (msg.type === 'SKIP_WAITING' || msg.type === '__CLAIM__') {
    self.skipWaiting();
    return;
  }

  switch (msg.type) {

    case 'SCHEDULE_NOTIFICATION':
      schedule(
        msg.id || msg.tag || 'focus',
        Date.now() + (msg.delay || 0),
        msg.title,
        msg.body,
        {
          tag: msg.tag || 'focus',
          vibrate: msg.vibrate || [200, 100, 200],
          requireInteraction: msg.requireInteraction || false,
          actions: msg.actions || [],
          data: msg.data || {},
        }
      );
      break;

    case 'SCHEDULE_SESSION_END':
      schedule(
        'session-end',
        msg.endsAt || Date.now(),
        msg.title || '⏱ Session Complete!',
        msg.body || 'Great work — session finished!',
        {
          tag: 'session-end',
          vibrate: [200, 100, 200, 100, 400],
          requireInteraction: true,
          actions: [
            { action: 'mark_done', title: '✅ Mark Complete' },
            { action: 'more_time', title: '⏰ +5 min' },
          ],
          data: { taskId: msg.taskId, url: '/FocusSession' },
        }
      );
      break;

    case 'SCHEDULE_BREAK':
      schedule(
        'break-start',
        msg.startsAt || Date.now(),
        'Break Time! ☕',
        msg.body || 'Stretch, hydrate, or just breathe.',
        {
          tag: 'break-start',
          vibrate: [300, 150, 300],
          requireInteraction: true,
          actions: [
            { action: 'start_break', title: '☕ Start Break' },
            { action: 'skip_break', title: '⏩ Skip Break' },
          ],
          data: { url: '/FocusSession' },
        }
      );
      break;

    case 'SCHEDULE_POMODORO_COMPLETE':
      schedule(
        'pomodoro',
        msg.completesAt || Date.now(),
        'Pomodoro Complete! 🍅',
        msg.body || 'Time for a break! Great work.',
        {
          tag: 'pomodoro',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          actions: [
            { action: 'start_break', title: '☕ Start Break' },
            { action: 'skip_break', title: '⏩ Skip Break' },
          ],
          data: { url: '/FocusSession' },
        }
      );
      break;

    case 'SCHEDULE_ENCOURAGEMENT':
      schedule(
        'encouragement',
        msg.endsAt || Date.now(),
        'Keep Going! 💪',
        msg.body || "You're doing amazing!",
        {
          tag: 'encouragement',
          vibrate: [100, 50, 100],
          requireInteraction: false,
          data: { url: '/FocusSession' },
        }
      );
      break;

    case 'CANCEL_NOTIFICATION':
      clearExisting(msg.id);
      removePending(msg.id);
      break;

    case 'CANCEL_ALL':
      for (const tid of PENDING.values()) clearTimeout(tid);
      PENDING.clear();
      clearAllPending();
      break;
  }
});

// ── Notification click — open/focus the app ───────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  const data = event.notification.data || {};
  const targetUrl = data.url || '/FocusSession';

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
