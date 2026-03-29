/**
 * ESC ACS Living Meta-Analysis - Service Worker for PWA Offline Support
 *
 * Provides:
 * - Offline capability for core analysis functions
 * - Cache-first strategy for static assets
 * - Network-first for API calls with fallback
 * - Background sync for pending analyses
 *
 * @version 1.0.0
 * @date 2026-01-26
 */

const CACHE_NAME = 'esc-acs-meta-v2.5.0';
const STATIC_CACHE = 'esc-acs-static-v2.5.0';
const DATA_CACHE = 'esc-acs-data-v2.5.0';

// Core application files to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/analysis.js',
  '/visualization-advanced.js',
  '/collaboration.js',
  '/ai-core.js',
  '/ml-local.js',
  '/living-review.js',
  '/r-validation.js',
  '/topics.js',
  '/worker.js',
  '/cache.js',
  '/datasets.js',
  '/tests.js',
  '/styles.css',
  '/manifest.json',
  // External CDN resources (cache on first load)
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js'
];

// API endpoints that support offline fallback
const API_ROUTES = [
  'clinicaltrials.gov',
  'eutils.ncbi.nlm.nih.gov',
  'api.elsevier.com'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('http')));
      })
      .then(() => self.skipWaiting())
      .catch(err => {
        console.error('[ServiceWorker] Cache failed:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== STATIC_CACHE && name !== DATA_CACHE)
          .map(name => {
            console.log('[ServiceWorker] Removing old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests (network-first with cache fallback)
  if (API_ROUTES.some(route => url.hostname.includes(route))) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Handle static assets (cache-first)
  event.respondWith(cacheFirstWithNetwork(request));
});

/**
 * Cache-first strategy for static assets
 */
async function cacheFirstWithNetwork(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Update cache in background
    fetchAndCache(request);
    return cachedResponse;
  }
  return fetchAndCache(request);
}

/**
 * Network-first strategy with cache fallback for API requests
 */
async function networkFirstWithCache(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline fallback for API requests
    return new Response(JSON.stringify({
      error: 'offline',
      message: 'You are offline. This data was not available in cache.',
      cached: false
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Fetch and update cache
 */
async function fetchAndCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return cached version or offline page
    const cached = await caches.match(request);
    if (cached) return cached;

    // Return offline HTML for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }

    throw error;
  }
}

// Background sync for pending analyses
self.addEventListener('sync', event => {
  if (event.tag === 'sync-analyses') {
    event.waitUntil(syncPendingAnalyses());
  }
});

/**
 * Sync pending analyses when back online
 */
async function syncPendingAnalyses() {
  const cache = await caches.open(DATA_CACHE);
  const pendingKey = 'pending-analyses';

  try {
    const pendingResponse = await cache.match(pendingKey);
    if (!pendingResponse) return;

    const pending = await pendingResponse.json();
    console.log('[ServiceWorker] Syncing', pending.length, 'pending analyses');

    for (const analysis of pending) {
      try {
        await fetch(analysis.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(analysis.data)
        });
      } catch (e) {
        console.error('[ServiceWorker] Sync failed for:', analysis.id);
      }
    }

    // Clear pending queue
    await cache.delete(pendingKey);
  } catch (error) {
    console.error('[ServiceWorker] Sync error:', error);
  }
}

// Push notifications for evidence alerts
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New evidence detected',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      analysisId: data.analysisId
    },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'ESC ACS Meta', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        const url = event.notification.data?.url || '/';
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(url);
      })
    );
  }
});

// Message handler for cache management
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data.action === 'clearCache') {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
  if (event.data.action === 'getCacheSize') {
    getCacheSize().then(size => {
      event.ports[0].postMessage({ size });
    });
  }
});

/**
 * Calculate total cache size
 */
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    for (const key of keys) {
      const response = await cache.match(key);
      if (response) {
        const blob = await response.clone().blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

console.log('[ServiceWorker] Loaded - ESC ACS Living Meta-Analysis v2.5.0');
