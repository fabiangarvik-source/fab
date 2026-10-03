// Minimal service worker: makes the app installable, always goes to the network
// (game state is live, so nothing is cached).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
