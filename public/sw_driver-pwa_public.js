// Fleet Apex Driver — Service Worker v5 (Run 5 — Offline Engine)
// Extra: Background GPS queue, offline navigation tiles cache

const CACHE_STATIC = 'fa-driver-static-v5';
const CACHE_PAGES  = 'fa-driver-pages-v5';
const CACHE_TILES  = 'fa-driver-tiles-v5';   // map tiles (large cache)
const CACHE_API    = 'fa-driver-api-v5';
const ALL_CACHES   = [CACHE_STATIC, CACHE_PAGES, CACHE_TILES, CACHE_API];

const MAX_TILE_CACHE = 500; // max map tiles to cache (keep route corridors)

const PRECACHE_STATIC = [
  './install.html',
  './manifest_driver-pwa_public.json',
  './fa-offline-db.js',
  './fa-native-bridge.js',
  './fa-native-experience.js',
  './plugin-core.js',
  './icon-driver.svg',
  './icon-driver-48.png',
  './icon-driver-192.png',
  './icon-driver-512.png',
];

const TILE_PATTERNS = [
  /tile\.openstreetmap\.org/,
  /\.maptiler\.com\/tiles/,
  /arcgisonline\.com\/ArcGIS\/rest\/services/,
];

const NETWORK_FIRST_PATTERNS = [
  /supabase\.co/,
  /graphhopper\.com/,
  /openai\.com/,
  /nominatim/,
  /openweather/,
];

const CACHE_FIRST_PATTERNS = [
  /unpkg\.com/,
  /cdnjs\.cloudflare\.com/,
  /fonts\.gstatic\.com/,
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_STATIC)
      .then(c => Promise.allSettled(PRECACHE_STATIC.map(u =>
        c.add(u).catch(err => console.warn('[SW Driver] Precache miss:', u, err.message))
      )))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !ALL_CACHES.includes(k)).map(k => {
          console.log('[SW Driver] Evicting:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Map tiles — cache-first with LRU eviction
  if (TILE_PATTERNS.some(p => p.test(url.href))) {
    e.respondWith(tileCache(request));
    return;
  }

  // 2. Network-first: APIs
  if (NETWORK_FIRST_PATTERNS.some(p => p.test(url.href))) {
    e.respondWith(networkFirst(request, CACHE_API, 10000));
    return;
  }

  // 3. Cache-first: CDN assets
  if (CACHE_FIRST_PATTERNS.some(p => p.test(url.href))) {
    e.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // 4. Same-origin: stale-while-revalidate
  if (url.origin === self.location.origin) {
    e.respondWith(staleWhileRevalidate(request, CACHE_PAGES));
    return;
  }
});

// ── Tile caching with LRU eviction ────────────────────────────────────────────
async function tileCache(request) {
  const cache  = await caches.open(CACHE_TILES);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') {
      // Evict oldest tile if over limit
      const keys = await cache.keys();
      if (keys.length >= MAX_TILE_CACHE) {
        await cache.delete(keys[0]); // FIFO eviction
      }
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch(err) {
    // Return empty 1x1 transparent PNG as tile placeholder
    const placeholder = new Uint8Array([
      0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,
      0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x00,0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53,
      0xde,0x00,0x00,0x00,0x0c,0x49,0x44,0x41,0x54,0x78,0x9c,0x62,0x60,0x60,0x60,0x00,
      0x00,0x00,0x04,0x00,0x01,0xf6,0x17,0x26,0x77,0x00,0x00,0x00,0x00,0x49,0x45,0x4e,
      0x44,0xae,0x42,0x60,0x82
    ]);
    return new Response(placeholder, {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'X-FA-Offline': '1' }
    });
  }
}

async function networkFirst(request, cacheName, timeoutMs) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(tid);
    if (response.ok || response.type === 'opaque') {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch(err) {
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503, headers: { 'Content-Type': 'application/json', 'X-FA-Offline': '1' }
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch(err) {
    return new Response('', { status: 503, headers: { 'X-FA-Offline': '1' } });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(r => {
    if (r.ok) cache.put(request, r.clone()).catch(() => {});
    return r;
  }).catch(() => cached);
  return cached || fetchPromise;
}

// ── Background Sync ───────────────────────────────────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'fa-sync-queue') {
    e.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients =>
        clients.forEach(c => c.postMessage({ type: 'fa:drainQueue' }))
      )
    );
  }
  if (e.tag === 'fa-gps-flush') {
    e.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients =>
        clients.forEach(c => c.postMessage({ type: 'fa:flushGPS' }))
      )
    );
  }
});

// ── Push notifications (driver-specific) ─────────────────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return;
  let payload;
  try { payload = e.data.json(); } catch(err) { payload = { title: 'Dispatch', body: e.data.text() }; }

  const options = {
    body:    payload.body || '',
    icon:    './icon-driver-192.png',
    badge:   './icon-driver-48.png',
    tag:     payload.tag || 'dispatch',
    data:    payload.data || {},
    vibrate: payload.urgent ? [300, 100, 300, 100, 300] : [200, 50, 200],
    actions: payload.actions || [
      { action: 'ack',  title: '✅ Acknowledge' },
      { action: 'call', title: '📞 Call Manager' },
    ],
    requireInteraction: !!payload.urgent,
    silent: false,
  };

  e.waitUntil(self.registration.showNotification(payload.title || 'Fleet Apex', options));
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const action = e.action;
  const data   = e.notification.data || {};

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const target = clients.find(c => c.focused) || clients[0];
      if (target) {
        target.focus();
        target.postMessage({ type: 'fa:notificationClick', action, data });
      } else {
        self.clients.openWindow('./install.html?app=driver');
      }
    })
  );
});

// ── Message from app ─────────────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'fa:skipWaiting') self.skipWaiting();
  if (e.data?.type === 'fa:cacheTiles') {
    // Pre-cache a corridor of tiles for a route
    const { tiles } = e.data;
    if (!Array.isArray(tiles)) return;
    caches.open(CACHE_TILES).then(cache => {
      tiles.forEach(url => cache.add(url).catch(() => {}));
    });
  }
  if (e.data?.type === 'fa:ping')
    e.source?.postMessage({ type: 'fa:pong', ts: Date.now(), version: 5, app: 'driver' });
});

console.log('[SW Driver v5] Loaded — Run 5 Offline Engine');
