const CACHE_NAME = "packtracker-shell-v20260422-1";
const APP_SHELL_FILES = [
  "./",
  "./index.html",
  "./css/style.css?v=20260420-1",
  "./js/drag-order.js?v=20260420-1",
  "./js/platform.js?v=20260420-1",
  "./js/state.js?v=20260420-1",
  "./js/storage.js?v=20260420-1",
  "./js/modrinth.js?v=20260420-1",
  "./js/curseforge.js?v=20260420-1",
  "./js/download-cache.js?v=20260420-1",
  "./js/scanner.js?v=20260420-1",
  "./js/ui-sidebar.js?v=20260420-1",
  "./js/ui-modlist.js?v=20260420-1",
  "./js/ui-share.js?v=20260420-1",
  "./js/ui-search.js?v=20260420-1",
  "./js/main.js?v=20260420-1",
  "./assets/logo.png?v=20260420-1",
  "./manifest.webmanifest?v=20260422-1"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      }).catch(async () => {
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }

        throw new Error("Network request failed");
      });
    })
  );
});
