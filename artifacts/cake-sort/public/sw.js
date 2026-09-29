/*
 * Cake Sort Fun service worker: keeps the game playable with no network.
 *
 * - On install it saves the page and everything the page needs: the built
 *   scripts and styles (read out of index.html), the fonts (read out of the
 *   styles), the icons and the manifest. So one visit is enough to play offline.
 * - The page itself is fetched network-first, so a new deploy shows up on the
 *   next launch when online, and the cached copy is used when offline.
 * - Built assets carry a content hash in their name, so they are cache-first.
 * - All the games share japlanet.github.io, and so share one set of caches.
 *   This worker only ever deletes caches whose names start with its own
 *   prefix, so installing or updating it never wipes another game's offline copy.
 */
const PREFIX = "cake-sort-";
const CACHE = PREFIX + "v3";
const SCOPE = new URL(self.registration.scope).pathname;
const EXTRAS = ["manifest.webmanifest", "favicon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

function sameOriginUrls(text, base, pattern) {
  const urls = new Set();
  for (const m of text.matchAll(pattern)) {
    try {
      const url = new URL(m[1], base);
      if (url.origin === self.location.origin) urls.add(url.href);
    } catch {}
  }
  return urls;
}
const HTML_REFS = /(?:src|href)="([^"]+)"/g;
const CSS_REFS = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;

async function precache() {
  const cache = await caches.open(CACHE);
  const shell = new URL(SCOPE, self.location.origin).href;
  const page = await fetch(shell, { cache: "no-cache" });
  if (!page.ok) throw new Error(`Could not fetch the game page: ${page.status}`);
  const html = await page.clone().text();
  await cache.put(shell, page);

  const urls = sameOriginUrls(html, shell, HTML_REFS);
  for (const name of EXTRAS) urls.add(new URL(name, shell).href);
  // Fonts are named inside the stylesheets, not the page.
  for (const href of [...urls].filter(u => u.endsWith(".css"))) {
    try {
      const css = await (await fetch(href)).text();
      for (const u of sameOriginUrls(css, href, CSS_REFS)) if (u.endsWith(".woff2")) urls.add(u);
    } catch {}
  }
  // Each file on its own, so one miss does not stop the rest.
  await Promise.all([...urls].map(u => cache.add(u).catch(() => undefined)));
}

self.addEventListener("install", event => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Drop built assets that the newest page no longer uses. */
async function pruneStale(cache, html, shell) {
  const live = sameOriginUrls(html, shell, HTML_REFS);
  const assets = new URL("assets/", shell).href;
  for (const req of await cache.keys()) {
    if (req.url.startsWith(assets) && !req.url.endsWith(".woff2") && !live.has(req.url)) await cache.delete(req);
  }
}

async function page() {
  const cache = await caches.open(CACHE);
  const shell = new URL(SCOPE, self.location.origin).href;
  try {
    const fresh = await fetch(shell, { cache: "no-cache" });
    if (fresh.ok) {
      const html = await fresh.clone().text();
      await cache.put(shell, fresh.clone());
      pruneStale(cache, html, shell).catch(() => undefined);
    }
    return fresh;
  } catch {
    return (await cache.match(shell)) || (await cache.match(shell + "index.html")) || Response.error();
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
      if (fresh.ok) cache.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => cached);
  return cached || refresh;
}

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;
  // The "Check for update" button asks the website for the current page; never cache or answer that.
  if (url.searchParams.has("update-check")) return;

  if (request.mode === "navigate") {
    event.respondWith(page());
  } else if (url.pathname.startsWith(SCOPE + "assets/")) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});
