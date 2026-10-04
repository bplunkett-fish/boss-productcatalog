// Keeps the app's own screens on the device so a browser tab can be opened with
// no signal. Only same-origin GET requests are handled, and anything under
// /api/ or /functions/ is left alone: live data, sign-in and integration calls
// must always go to the network. The catalog itself is stored separately by the
// app, so this file only covers the screens and their code.

const VERSION = "v1";
const SHELL_CACHE = `myboss-shell-${VERSION}`;
const ASSET_CACHE = `myboss-assets-${VERSION}`;
const PRECACHE = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.all(PRECACHE.map(async (url) => {
      try {
        await cache.add(new Request(url, { cache: "reload" }));
      } catch {
        // A missing file must not block the rest of the install.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("myboss-") && key !== SHELL_CACHE && key !== ASSET_CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

// Build assets carry a content hash, so a saved copy is never out of date.
function isCacheableAsset(url) {
  return url.pathname.startsWith("/assets/") ||
    /\.(?:js|css|woff2?|ttf|png|jpe?g|svg|webp|ico)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/functions/")) return;

  // App screens: try the network first so a new version is picked up as soon as
  // one is online, and fall back to the saved copy when there is no signal.
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(SHELL_CACHE);
          cache.put("/", response.clone());
        }
        return response;
      } catch {
        const cached = await caches.match("/", { ignoreSearch: true });
        if (cached) return cached;
        return new Response("Offline", {
          status: 503,
          headers: { "Content-Type": "text/plain" }
        });
      }
    })());
    return;
  }

  if (!isCacheableAsset(url)) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response && response.ok && response.type === "basic") {
      const cache = await caches.open(ASSET_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  })());
});
