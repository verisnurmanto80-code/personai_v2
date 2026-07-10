const CACHE_NAME = 'persona-shell-v2';
const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: cache the app shell so UI + reminders open with no connection
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Requests to api.anthropic.com always go to network (chat needs live connection)
// - Everything else (shell files, fonts): cache-first, falling back to network, so the
//   app shell and reminders work with the phone in airplane mode
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (url.includes('api.anthropic.com')) {
    // Never cache API calls, just let them hit the network directly
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Cache a copy of anything same-origin we fetch successfully (e.g. fonts)
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
    })
  );
});
