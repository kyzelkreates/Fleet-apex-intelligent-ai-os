// Fleet Apex Admin — Service Worker v5 (Run 5 — Offline Engine)
// Strategy: Cache-First for static assets, Network-First for API, Background Sync for writes

const CACHE_STATIC = 'fa-admin-static-v5';
const CACHE_PAGES  = 'fa-admin-pages-v5';
const CACHE_API    = 'fa-admin-api-v5';
const ALL_CACHES   = [CACHE_STATIC, CACHE_PAGES, CACHE_API];

// Static assets — precached on install (cache-first forever)
const PRECACHE_STATIC = [
  './install.html',
  './manifest.json',
  './fa-offline-db.js',
  './fa-native-bridge.js',
  './fa-native-experience.js',
  './plugin-core.js',
  './icon-admin.svg',
  './icon-admin-48.png',
  './icon-admin-192.png',
  './icon-admin-512.png',
];

// Network-first patterns (always try fresh, fallback to cache)
const NETWORK_FIRST_PATTERNS = [
  /supabase\.co/,
  /graphhopper\.com/,
  /openai\.com/,
  /openstreetmap\.org/,
  /nominatim/,
];

// Cache-first patterns (static CDN assets)
const CACHE_FIRST_PATTERNS = [
  /unpkg\.com/,
  /cdnjs\.cloudflare\.com/,
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
  /maptiler\.com\/maps/,
  /tile\.openstreetmap\.org/,
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_STATIC)
      .then(c => Promise.allSettled(PRECACHE_STATIC.map(u =>
        c.add(u).catch(err => console.warn('[SW Admin] Precache miss:', u, err.message))
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
          console.log('[SW Admin] Evicting stale cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return; // let POST/PUT/DELETE through

  const url = new URL(request.url);

  // 1. Network-first: API calls (Supabase, GraphHopper, AI)
  if (NETWORK_FIRST_PATTERNS.some(p => p.test(url.href))) {
    e.respondWith(networkFirst(request, CACHE_API, 8000));
    return;
  }

  // 2. Cache-first: CDN / tile / font assets
  if (CACHE_FIRST_PATTERNS.some(p => p.test(url.href))) {
    e.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // 3. Same-origin: stale-while-revalidate
  if (url.origin === self.location.origin) {
    e.respondWith(staleWhileRevalidate(request, CACHE_PAGES));
    return;
  }
});

// ── Strategies ────────────────────────────────────────────────────────────────
async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
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
    if (cached) {
      console.log('[SW Admin] Offline fallback:', request.url.slice(-50));
      return cached;
    }
    return new Response(JSON.stringify({ error: 'offline', message: 'No cached data available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'X-FA-Offline': '1' }
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch(err) {
    return new Response('', { status: 503, headers: { 'X-FA-Offline': '1' } });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

// ── Background Sync ───────────────────────────────────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'fa-sync-queue') {
    e.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'fa:drainQueue' }));
      })
    );
  }
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return;
  let payload;
  try { payload = e.data.json(); } catch(err) { payload = { title: 'Fleet Apex', body: e.data.text() }; }

  const options = {
    body:    payload.body || '',
    icon:    './icon-admin-192.png',
    badge:   './icon-admin-48.png',
    tag:     payload.tag || 'fleet-alert',
    data:    payload.data || {},
    vibrate: payload.urgent ? [200, 100, 200, 100, 200] : [100, 50, 100],
    actions: payload.actions || [],
    requireInteraction: !!payload.urgent,
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
        self.clients.openWindow('./install.html?app=admin');
      }
    })
  );
});

// ── Message from app ─────────────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'fa:skipWaiting') self.skipWaiting();
  if (e.data?.type === 'fa:ping')
    e.source?.postMessage({ type: 'fa:pong', ts: Date.now(), version: 5 });
});

console.log('[SW Admin v5] Loaded — Run 5 Offline Engine');
