// TaskBuddy Service Worker — background notifications + timer scheduling
const CACHE_NAME = "taskbuddy-v2";

// ── Install & Activate ────────────────────────────────────────────────────────
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(self.clients.claim())
);

// ── Scheduled notification registry ──────────────────────────────────────────
// Map of id → timeoutId (kept in SW memory for the lifetime of the SW)
const scheduledTimers = new Map();

function scheduleNotification(id, delayMs, title, body, options = {}) {
  // Clear any existing timer with this id
  if (scheduledTimers.has(id)) {
    clearTimeout(scheduledTimers.get(id));
    scheduledTimers.delete(id);
  }

  if (delayMs <= 0) {
    fireNotification(title, body, options);
    return;
  }

  const timer = setTimeout(() => {
    scheduledTimers.delete(id);
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
    // These two are key for Apple Watch / Wear OS mirror
    silent: false,
    renotify: true,
  });
}

function cancelTimer(id) {
  if (scheduledTimers.has(id)) {
    clearTimeout(scheduledTimers.get(id));
    scheduledTimers.delete(id);
  }
}

// ── Message handler (from page) ───────────────────────────────────────────────
self.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || !msg.type) return;

  switch (msg.type) {

    // Claim clients immediately (called on first install)
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

    // Cancel a specific scheduled notification
    case "CANCEL_NOTIFICATION":
      cancelTimer(msg.id);
      break;

    // Cancel all
    case "CANCEL_ALL":
      for (const id of scheduledTimers.keys()) cancelTimer(id);
      break;

    default:
      break;
  }
});

// ── Notification click handler ────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const targetUrl = "/FocusSession";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // If app is already open, focus it
        for (const client of clients) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
