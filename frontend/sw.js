const CACHE_NAME = 'smartcustomer-v3';
const ASSETS = [
  './',
  './index.html',
  './index.css',
  './app.jsx',
  './icon.png',
  './manifest.json',
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

// ── Install: cache assets ─────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clear old caches ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first for assets, network-first for API ─────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => res)
        .catch(() => new Response(JSON.stringify({ error: 'Offline' }), {
          headers: { 'Content-Type': 'application/json' }
        }))
    );
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).catch(() => caches.match('./index.html'))
    )
  );
});

// ── Background Sync: retry failed requests ────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalyticsData());
  }
});

async function syncAnalyticsData() {
  try {
    await fetch('/api/dashboard/kpis');
    console.log('[SW] Background sync: analytics data refreshed');
  } catch (err) {
    console.error('[SW] Background sync failed:', err);
  }
}

// ── Periodic Background Sync: refresh data every hour ────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'refresh-analytics') {
    event.waitUntil(syncAnalyticsData());
  }
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'SmartCustomer AI';
  const options = {
    body: data.body || 'You have new customer intelligence updates!',
    icon: './icon.png',
    badge: './icon.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'view', title: 'View Dashboard' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'view' || !event.action) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});
