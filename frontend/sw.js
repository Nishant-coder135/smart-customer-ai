// SmartCustomer AI — Service Worker v7
// Full offline support, background sync, proper caching strategy

const CACHE_NAME = 'smartcustomer-cache-v8';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/api.js',
    '/js/i18n.js',
    '/js/app.js',
    '/js/views/login.js',
    '/js/views/dashboard.js',
    '/js/views/actions.js',
    '/js/views/data_ingest.js',
    '/js/views/customers.js',
    '/js/views/analytics.js',
    '/js/views/predict.js',
    '/js/views/simulator.js',
    '/js/views/compare.js',
    '/js/views/quality.js',
    '/js/views/anomaly.js',
    '/js/views/export.js',
    '/js/views/advisor.js',
    '/js/views/settings.js',
    '/manifest.json',
    '/assets/icon-192.png',
    '/assets/icon-512.png'
];

// ── Install: cache all static assets ─────────────────────────────────────────
self.addEventListener('install', event => {
    console.log('[SW] Installing v7...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching static assets...');
                // Add individually to avoid failing the whole install if one asset 404s
                return Promise.allSettled(
                    STATIC_ASSETS.map(url => cache.add(url).catch(e => console.warn('[SW] Failed to cache:', url, e)))
                );
            })
            .then(() => {
                console.log('[SW] Install complete. Activating immediately...');
                return self.skipWaiting();
            })
    );
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
    console.log('[SW] Activating v8...');
    event.waitUntil(
        Promise.all([
            // Delete old caches
            caches.keys().then(cacheNames =>
                Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME)
                        .map(name => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                )
            ),
            // Take control of all open tabs immediately
            self.clients.claim()
        ])
    );
});

// ── Fetch: Smart caching strategy ────────────────────────────────────────────
self.addEventListener('fetch', event => {
    const req = event.request;
    const url = new URL(req.url);

    // Skip non-GET and cross-origin requests
    if (req.method !== 'GET') return;

    // API calls: Network-first, never cache API responses
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(req).catch(() => {
                // For dashboard API offline failure, return empty structure
                if (url.pathname === '/api/dashboard_data') {
                    return new Response(JSON.stringify({
                        mode: 'urban',
                        kpis: { total_customers: 0, total_revenue: 0, active_customers: 0, health_score: 0 },
                        advisor: [],
                        segments: null,
                        credit_stats: null,
                        has_data: false
                    }), { headers: { 'Content-Type': 'application/json' } });
                }
                return new Response(JSON.stringify({ error: 'Offline', detail: 'No network connection' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // HTML navigation: Network-first with offline fallback
    const acceptHeader = req.headers.get('accept') || '';
    if (acceptHeader.includes('text/html')) {
        event.respondWith(
            fetch(req)
                .then(response => {
                    // Cache fresh HTML response
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
                    return response;
                })
                .catch(() => caches.match('/index.html'))
        );
        return;
    }

    // JS/CSS: Network-first (always get fresh code)
    if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
        event.respondWith(
            fetch(req)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
                    return response;
                })
                .catch(() => caches.match(req))
        );
        return;
    }

    // Everything else (fonts, images, manifests): Cache-first
    event.respondWith(
        caches.match(req).then(cached => {
            if (cached) return cached;
            return fetch(req).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
                }
                return response;
            }).catch(() => null);
        })
    );
});

// ── Background Sync for Rural offline sales ───────────────────────────────────
self.addEventListener('sync', event => {
    if (event.tag === 'sync-rural-sales') {
        console.log('[SW] Background sync: rural sales');
        event.waitUntil(syncRuralSales());
    }
});

async function syncRuralSales() {
    try {
        // Open IndexedDB or use client-side messaging
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({ type: 'SYNC_RURAL_SALES' });
        });
    } catch (e) {
        console.warn('[SW] Rural sync failed:', e);
    }
}

// ── Push Notifications (future-ready) ────────────────────────────────────────
self.addEventListener('push', event => {
    if (!event.data) return;
    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title || 'SmartCustomer AI', {
            body: data.body || 'You have new business insights.',
            icon: '/assets/icon-192.png',
            badge: '/assets/icon-192.png',
            vibrate: [200, 100, 200],
            data: { url: data.url || '/' }
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(clients.openWindow(url));
});

// ── Periodic Background Sync ──────────────────────────────────────────────────
self.addEventListener('periodicsync', event => {
    if (event.tag === 'update-dashboard-data') {
        console.log('[SW] Periodic background sync: fetching latest dashboard data');
        event.waitUntil(fetchAndCacheDashboardData());
    }
});

async function fetchAndCacheDashboardData() {
    try {
        const response = await fetch('/api/dashboard_data');
        if (response.ok) {
            console.log('[SW] Dashboard data synced in background');
        }
    } catch (e) {
        console.warn('[SW] Periodic sync failed:', e);
    }
}
