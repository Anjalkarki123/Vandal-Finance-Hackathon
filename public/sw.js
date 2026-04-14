// Budget Guardian Service Worker — v2
const CACHE = "budget-guardian-v2";
const SHELL = [
  "/Vandal-Finance-Hackathon/",
  "/Vandal-Finance-Hackathon/index.html",
  "/Vandal-Finance-Hackathon/icon-192.png",
  "/Vandal-Finance-Hackathon/icon-512.png",
  "/Vandal-Finance-Hackathon/manifest.json",
];

// Install: cache app shell
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: remove old caches, take control
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for assets, network-first for navigation
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // Navigation (HTML pages) — network first, fall back to cached index
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match("/Vandal-Finance-Hackathon/index.html"))
    );
    return;
  }

  // JS/CSS/image assets — cache first, update in background
  if (url.pathname.match(/\.(js|css|png|svg|ico|woff2?)$/)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const network = fetch(e.request).then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        });
        return cached || network;
      })
    );
    return;
  }

  // Everything else — network with cache fallback
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
