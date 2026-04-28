// TaskBuddy Service Worker
const CACHE_NAME = 'taskbuddy-v2';

// On install — skip waiting immediately so new SW activates right away
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// On activate — claim all clients and delete ALL old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Listen for SKIP_WAITING message from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch — network first, no caching of JS/CSS chunks (prevents stale React)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache Vite JS/CSS chunks or API calls — always go to network
  if (
    url.pathname.includes('/src/') ||
    url.pathname.includes('/node_modules/') ||
    url.pathname.includes('/.vite/') ||
    url.pathname.includes('/api/') ||
    url.search.includes('v=') ||
    url.search.includes('t=')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For everything else — network first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
