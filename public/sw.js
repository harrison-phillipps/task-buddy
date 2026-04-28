// TaskBuddy Service Worker - Network only for all JS assets
const CACHE_NAME = 'taskbuddy-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Always fetch from network — never serve JS/CSS from cache
// This prevents stale React chunk mismatches
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only cache static image/font assets — never JS or CSS
  const isStaticAsset =
    /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)(\?.*)?$/.test(url.pathname);

  if (!isStaticAsset) {
    // Network-only for JS, CSS, HTML, API calls
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for images/fonts only
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
