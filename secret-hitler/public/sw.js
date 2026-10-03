// Service worker: makes the app installable and lets solo mode run offline.
// Multiplayer state (/api) always goes to the network. Pages are network-first
// with a cached fallback; hashed build assets are cache-first.
const CACHE = "sh-v2";
const PAGES = ["/", "/solo", "/rules"];
const ASSETS = ["/manifest.webmanifest", "/icon.svg", "/icon-192.png"];

async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(ASSETS).catch(() => {});
  for (const page of PAGES) {
    try {
      const res = await fetch(page, { cache: "no-store" });
      if (!res.ok) continue;
      await cache.put(page, res.clone());
      // Pull in every script and stylesheet the page needs, so it boots offline.
      const html = await res.text();
      const urls = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])];
      await Promise.all(urls.map((u) => cache.add(u).catch(() => {})));
    } catch {}
  }
}

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(precache());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = (await cache.match(req)) || (await cache.match(req, { ignoreSearch: true }));
    if (hit) return hit;
    if (req.mode === "navigate") {
      const path = new URL(req.url).pathname;
      if (path.startsWith("/solo")) {
        const solo = await cache.match("/solo");
        if (solo) return solo;
      }
      const home = await cache.match("/");
      if (home) return home;
    }
    throw new Error("offline");
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.startsWith("/api/")) return;
    if (url.pathname.startsWith("/_next/static/")) return e.respondWith(cacheFirst(req));
    return e.respondWith(networkFirst(req));
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") e.respondWith(cacheFirst(req));
});
