// TaskBuddy Focus Session Service Worker
// Enables rich notifications with action buttons (mirror to smartwatch)

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes('/FocusSession') && 'focus' in client) {
          client.focus();
          // Send action to the page
          if (action) {
            client.postMessage({ type: 'NOTIFICATION_ACTION', action, data });
          }
          return;
        }
      }
      // Otherwise open the app
      if (self.clients.openWindow) {
        return self.clients.openWindow('/FocusSession');
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { delay, title, body, tag, actions, data } = event.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: tag || 'focus-session',
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: true,
        actions: actions || [],
        data: data || {}
      });
    }, delay);
  }

  if (event.data?.type === 'CANCEL_NOTIFICATIONS') {
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach((n) => n.close());
    });
  }
});
