/*
 * Cake Sort Fun service worker: keeps the game playable with no network.
 *
 * - The page itself is fetched network-first, so a new deploy shows up on the
 *   next launch when online, and the cached copy is used when offline.
 * - Built assets carry a content hash in their name, so they are cache-first.
 * - Anything else same-origin (icons, manifest) and the web fonts are served
 *   from cache while being refreshed in the background.
 */
const CACHE = "cake-sort-v1";
const SCOPE = new URL(self.registration.scope).pathname;

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll([SCOPE, SCOPE + "index.html"]).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(fallbackUrl, fresh.clone());
    return fresh;
  } catch {
    const cached = (await cache.match(fallbackUrl)) || (await cache.match(SCOPE + "index.html"));
    return cached || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then(fresh => {
      if (fresh.ok || fresh.type === "opaque") cache.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => cached);
  return cached || refresh;
}

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SCOPE));
    return;
  }
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith(SCOPE + "assets/")) {
      event.respondWith(cacheFirst(request));
    } else {
      event.respondWith(staleWhileRevalidate(request));
    }
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(staleWhileRevalidate(request));
  }
});
