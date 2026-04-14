// Cache version — bump this to force all clients to get fresh files
const CACHE = "budget-guardian-v3";

// On install: skip waiting so new SW activates immediately
self.addEventListener("install", e => {
  e.waitUntil(self.skipWaiting());
});

// On activate: delete ALL old caches and claim clients immediately
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first strategy: always try network, fall back to cache
// This ensures users always get the latest version
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // Don't cache API calls or external resources
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
