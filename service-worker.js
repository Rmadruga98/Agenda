const CACHE_NAME = "madruga-agenda-v5";
const REPO = "/Agenda";

const FILES_TO_CACHE = [
  `${REPO}/`,
  `${REPO}/index.html`,
  `${REPO}/style.css`,
  `${REPO}/script.js`,
  `${REPO}/manifest.json`,
  `${REPO}/logo-192.png`,
  `${REPO}/logo-512.png`
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});