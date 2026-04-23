const CACHE_NAME = "packtracker-shell-v20260423-16";
const APP_SHELL_FILES = [
  "./",
  "./index.html",
  "./css/style.css?v=20260423-16",
  "./js/drag-order.js?v=20260423-16",
  "./js/platform.js?v=20260423-16",
  "./js/state.js?v=20260423-16",
  "./js/storage.js?v=20260423-16",
  "./js/modrinth.js?v=20260423-16",
  "./js/curseforge.js?v=20260423-16",
  "./js/download-cache.js?v=20260423-16",
  "./js/scanner.js?v=20260423-16",
  "./js/ui-sidebar.js?v=20260423-16",
  "./js/ui-modlist.js?v=20260423-16",
  "./js/ui-share.js?v=20260423-16",
  "./js/ui-search.js?v=20260423-16",
  "./js/main.js?v=20260423-16",
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
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
          if (event.request.mode === "navigate" || requestUrl.pathname.endsWith("/index.html")) {
            cache.put("./index.html", networkResponse.clone());
          }
        });
      }
      return networkResponse;
    }).catch(async () => {
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }

      if (event.request.mode === "navigate") {
        return caches.match("./index.html");
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
        throw new Error("Network request failed");
      });
    })
  );
});
