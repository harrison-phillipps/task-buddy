/**
 * TaskBuddy Service Worker
 * - App shell caching for offline loading
 * - Notification scheduling via IndexedDB (persistent across SW restarts)
 * - Keep-alive ping support
 */

const CACHE_NAME = 'taskbuddy-shell-v1';
const SHELL_URLS = ['/', '/index.html'];

// ─── IndexedDB for persistent notification timers ─────────────────────────

const IDB_NAME = 'taskbuddy_sw';
const IDB_STORE = 'scheduled_notifications';

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function saveScheduledNotification(record) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(record);
    tx.oncomplete = resolve;
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function removeScheduledNotification(id) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function getAllScheduledNotifications() {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

// ─── Timers (in-memory, re-seeded from IDB on SW start) ───────────────────

const activeTimers = new Map();

function scheduleTimer(record) {
  const delay = record.fireAt - Date.now();
  if (delay <= 0) {
    fireNotification(record);
    return;
  }
  const timerId = setTimeout(() => fireNotification(record), delay);
  activeTimers.set(record.id, timerId);
}

async function fireNotification(record) {
  activeTimers.delete(record.id);
  await removeScheduledNotification(record.id);
  self.registration.showNotification(record.title, {
    body: record.body || '',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    tag: record.id,
    data: record.data || {},
  });
}

async function seedTimersFromIDB() {
  const records = await getAllScheduledNotifications();
  records.forEach(scheduleTimer);
}

// ─── Install & Activate ────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Remove old caches
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
      // Re-seed notification timers
      seedTimersFromIDB(),
      self.clients.claim(),
    ])
  );
});

// ─── Fetch: Network-first for API, Cache-first for shell ──────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Let API / external requests pass through normally
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api')) {
    return;
  }

  // For navigation requests (HTML pages): network-first, fallback to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return res;
      });
    })
  );
});

// ─── Message handler ──────────────────────────────────────────────────────

self.addEventListener('message', async (event) => {
  const { type, ...payload } = event.data || {};

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // Keep-alive ping (sent by FocusSession every 20s)
  if (type === 'KEEP_ALIVE') return;

  // Schedule a notification
  if (type === 'SCHEDULE_NOTIFICATION') {
    const record = {
      id: payload.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      fireAt: payload.fireAt || Date.now() + (payload.delayMs || 0),
      title: payload.title || 'TaskBuddy',
      body: payload.body || '',
      data: payload.data || {},
    };
    await saveScheduledNotification(record);
    scheduleTimer(record);
    return;
  }

  // Cancel a scheduled notification
  if (type === 'CANCEL_NOTIFICATION') {
    const timerId = activeTimers.get(payload.id);
    if (timerId) clearTimeout(timerId);
    activeTimers.delete(payload.id);
    await removeScheduledNotification(payload.id);
    return;
  }

  // Cancel all scheduled notifications
  if (type === 'CANCEL_ALL_NOTIFICATIONS') {
    activeTimers.forEach((id) => clearTimeout(id));
    activeTimers.clear();
    const all = await getAllScheduledNotifications();
    await Promise.all(all.map((r) => removeScheduledNotification(r.id)));
    return;
  }
});

// ─── Notification click ───────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});
