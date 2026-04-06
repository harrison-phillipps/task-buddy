// TaskBuddy Service Worker — background notifications + timer scheduling
// v3 — IndexedDB persistence so timers survive SW restarts (key for wearables)

const DB_NAME = "taskbuddy-sw";
const DB_VERSION = 1;
const STORE = "scheduled";

// ── Install & Activate ────────────────────────────────────────────────────────
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", async (e) => {
  e.waitUntil(
    self.clients.claim().then(() => restorePersistedTimers())
  );
});

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function persistTimer(id, fireAt, title, body, options) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ id, fireAt, title, body, options });
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    db.close();
  } catch (e) {
    console.warn("[SW] persistTimer failed:", e);
  }
}

async function clearPersistedTimer(id) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    db.close();
  } catch (e) {
    console.warn("[SW] clearPersistedTimer failed:", e);
  }
}

async function getAllPersistedTimers() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readonly");
    const all = await new Promise((res, rej) => {
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    db.close();
    return all;
  } catch (e) {
    console.warn("[SW] getAllPersistedTimers failed:", e);
    return [];
  }
}

// On SW activate/restart — restore any pending timers from IDB
async function restorePersistedTimers() {
  const timers = await getAllPersistedTimers();
  const now = Date.now();
  for (const t of timers) {
    const delay = t.fireAt - now;
    if (delay <= 0) {
      // Overdue — fire immediately (or skip if very old, e.g. > 10 min late)
      if (now - t.fireAt < 10 * 60 * 1000) {
        fireNotification(t.title, t.body, t.options);
      }
      await clearPersistedTimer(t.id);
    } else {
      // Re-schedule in memory
      scheduleNotification(t.id, delay, t.title, t.body, t.options, false);
    }
  }
}

// ── Scheduled notification registry ──────────────────────────────────────────
const scheduledTimers = new Map();

function scheduleNotification(id, delayMs, title, body, options = {}, persist = true) {
  // Clear any existing timer with this id
  if (scheduledTimers.has(id)) {
    clearTimeout(scheduledTimers.get(id));
    scheduledTimers.delete(id);
  }

  if (delayMs <= 0) {
    fireNotification(title, body, options);
    if (persist) clearPersistedTimer(id);
    return;
  }

  // Persist to IDB so it survives SW termination
  if (persist) {
    persistTimer(id, Date.now() + delayMs, title, body, options);
  }

  const timer = setTimeout(() => {
    scheduledTimers.delete(id);
    clearPersistedTimer(id);
    fireNotification(title, body, options);
  }, delayMs);

  scheduledTimers.set(id, timer);
}

function fireNotification(title, body, options = {}) {
  self.registration.showNotification(title, {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    vibrate: options.vibrate || [200, 100, 200],
    tag: options.tag || "taskbuddy",
    requireInteraction: options.requireInteraction || false,
    actions: options.actions || [],
    data: options.data || {},
    silent: false,
    renotify: true,
  });
}

function cancelTimer(id) {
  if (scheduledTimers.has(id)) {
    clearTimeout(scheduledTimers.get(id));
    scheduledTimers.delete(id);
  }
  clearPersistedTimer(id);
}

// ── Message handler (from page) ───────────────────────────────────────────────
self.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || !msg.type) return;

  switch (msg.type) {

    case "__CLAIM__":
      self.clients.claim();
      break;

    // Generic: show right now (or after optional delay ms)
    case "SCHEDULE_NOTIFICATION": {
      const delay = msg.delay || 0;
      scheduleNotification(
        msg.id || msg.tag || "general",
        delay,
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
    }

    // Session end — fires at exact timestamp
    case "SCHEDULE_SESSION_END": {
      const delay = msg.endsAt - Date.now();
      scheduleNotification(
        "session-end",
        delay,
        msg.title || "⏱ Session Complete!",
        msg.body || "Great work! Your focus session has ended.",
        { tag: "session-end", requireInteraction: true, vibrate: [200, 100, 200, 100, 400] }
      );
      break;
    }

    // Pomodoro complete — fires at exact timestamp
    case "SCHEDULE_POMODORO_COMPLETE": {
      const delay = msg.completesAt - Date.now();
      scheduleNotification(
        "pomodoro-complete",
        delay,
        "🍅 Pomodoro Complete!",
        msg.body || "Time for a break! Great work.",
        {
          tag: "pomodoro-complete",
          requireInteraction: true,
          vibrate: [200, 100, 200],
          actions: [
            { action: "start_break", title: "☕ Start Break" },
            { action: "skip_break", title: "⏩ Skip" },
          ],
        }
      );
      break;
    }

    // Break reminder
    case "SCHEDULE_BREAK_REMINDER": {
      const delay = msg.startsAt - Date.now();
      scheduleNotification(
        "break-reminder",
        delay,
        "☕ Break Time!",
        msg.body || "Take a short break to recharge.",
        { tag: "break-reminder", requireInteraction: false, vibrate: [200, 100, 200] }
      );
      break;
    }

    // Cancel a specific scheduled notification
    case "CANCEL_NOTIFICATION":
      cancelTimer(msg.id);
      break;

    // Cancel all
    case "CANCEL_ALL":
      for (const id of [...scheduledTimers.keys()]) cancelTimer(id);
      break;

    default:
      break;
  }
});

// ── Notification click handler ────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = "/FocusSession";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// ── Push event (for future Web Push support) ──────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      fireNotification(data.title || "TaskBuddy", data.body || "", {
        tag: data.tag || "push",
        requireInteraction: data.requireInteraction || false,
        vibrate: data.vibrate || [200, 100, 200],
      })
    );
  } catch (e) {
    console.warn("[SW] push event parse error:", e);
  }
});
