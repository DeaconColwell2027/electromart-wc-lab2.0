// sw.js: the service worker that lets the app install and work offline.
// Network-first: always try the live site, so each merged change shows up.
// If the network fails (offline), fall back to the copy saved in the cache.
// All paths are relative, because the site lives at /<repository>/.

const CACHE = "electromart-ccc-v1";
const FILES = [
  "./",
  "index.html",
  "styles.css",
  "ccc.js",
  "app.js",
  "manifest.webmanifest",
  "data/electromart.csv",
  "data/assumptions.csv",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only handle this site's own GET requests.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((hit) =>
          hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error())
        )
      )
  );
});
