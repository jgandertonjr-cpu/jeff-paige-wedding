// Offline support: serve from cache immediately, refresh the cache from the
// network in the background (stale-while-revalidate). App updates show up on
// the next launch. Bump CACHE if you ever need to force-clear old files.
const CACHE = 'pd-tracker-v1';
// The app page is cached as './' only: Netlify's pretty URLs redirect index.html to the folder.
const CORE = ['./'];
const EXTRAS = [
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

// Safari refuses to display a page whose service-worker response followed a redirect,
// so always store and serve a clean, non-redirected copy.
async function unredirect(res) {
  if (!res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}
async function precache(cache, url) {
  const res = await fetch(url, { cache: 'reload' });
  if (!res.ok) throw new Error('Precache failed: ' + url);
  await cache.put(url, await unredirect(res));
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // The app itself must cache; a missing icon should not stop offline mode from working.
      Promise.all(CORE.map((u) => precache(c, u)))
        .then(() => Promise.all(EXTRAS.map((u) => precache(c, u).catch(() => {}))))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('pd-tracker-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const APP_ROOT = new URL('./', self.location).pathname;          // e.g. /pd-tracker/
const APP_PAGES = [APP_ROOT, APP_ROOT + 'index.html', APP_ROOT + 'index'];

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Loading the app (/pd-tracker/, /pd-tracker/index.html, any ?query) is always the same page,
  // stored under './'. Other files (icons, manifest, the README) are cached under their own URL.
  const isAppPage = req.mode === 'navigate' && APP_PAGES.includes(url.pathname);
  const key = isAppPage ? './' : req;

  const network = fetch(req).then(async (raw) => {
    if (!raw || !raw.ok) return raw;
    const res = await unredirect(raw);
    const cache = await caches.open(CACHE);
    await cache.put(key, res.clone());
    return res;
  }).catch(() => null);
  e.waitUntil(network);

  const lookup = isAppPage ? caches.match('./') : caches.match(req, { ignoreSearch: true });
  e.respondWith(
    lookup.then((cached) => {
      if (cached) return cached;
      return network.then((res) => {
        if (res) return res;
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
