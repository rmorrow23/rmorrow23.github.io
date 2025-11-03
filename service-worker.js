const CACHE_NAME = 'morrow-industries-cache-v4';
const urlsToCache = [
  //  '/',
  //  '/index.html',
  // '/manifest.json',
  // '/assets/css/style.css'
];

// Install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

//fetch
self.addEventListener("fetch", (event) => {
  // Only handle GET requests (ignore POST, PUT, etc.)
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve from cache, then update in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open("dynamic-cache").then((cache) =>
              cache.put(event.request, networkResponse.clone())
            );
          }
        });
        return cachedResponse;
      }

      // Otherwise, fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          // Cache successful responses for next time
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open("dynamic-cache").then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          console.warn("⚠️ Fetch failed, offline?", event.request.url, err);
          // Optionally return a fallback (e.g. offline.html)
          return caches.match("/offline.html");
        });
    })
  );
});


// Activate
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.map(name => name !== CACHE_NAME && caches.delete(name))
    ))
  );
});
