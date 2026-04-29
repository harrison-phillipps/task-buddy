// TaskBuddy Service Worker - Push Notifications + Snooze

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'TaskBuddy', body: event.data.text() };
  }

  const { title, body, taskId, taskTitle, estimatedMinutes, dueDate, icon } = data;

  const options = {
    body,
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: `task-${taskId}`,
    renotify: true,
    requireInteraction: true,
    data: { taskId, taskTitle, estimatedMinutes, dueDate },
    actions: [
      { action: 'snooze_15', title: '⏰ Snooze 15 min' },
      { action: 'snooze_60', title: '⏰ Snooze 1 hr' },
      { action: 'open', title: '✅ Open Task' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  const { action } = event;
  const { taskId, taskTitle, estimatedMinutes, dueDate } = event.notification.data || {};

  event.notification.close();

  if (action === 'snooze_15' || action === 'snooze_60') {
    const snoozeMinutes = action === 'snooze_15' ? 15 : 60;

    // Schedule a new notification after the snooze delay
    event.waitUntil(
      new Promise((resolve) => {
        setTimeout(async () => {
          await self.registration.showNotification(`⏰ ${taskTitle}`, {
            body: `Snoozed reminder: "${taskTitle}" still needs your attention!`,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: `task-${taskId}-snoozed`,
            requireInteraction: true,
            data: { taskId, taskTitle, estimatedMinutes, dueDate },
            actions: [
              { action: 'snooze_15', title: '⏰ Snooze 15 min' },
              { action: 'open', title: '✅ Open Task' },
            ],
          });
          resolve();
        }, snoozeMinutes * 60 * 1000);
        // Resolve immediately so SW doesn't get killed; the setTimeout fires when possible
        resolve();
      })
    );
    return;
  }

  // 'open' action or plain click — navigate to the task
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const url = taskId ? `/Tasks?taskId=${taskId}` : '/Tasks';
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
