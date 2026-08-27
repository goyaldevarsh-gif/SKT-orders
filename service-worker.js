// SKT Orders App - Service Worker with Auto-Update
// Checks GitHub for latest version and auto-refreshes

const CACHE_NAME = 'skt-orders-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Install event - cache files immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Service Worker: Files cached');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.log('❌ Cache error:', err))
  );
  // Force this service worker to become active immediately
  self.skipWaiting();
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim all clients immediately (no need to refresh)
  self.clients.claim();
});

// Fetch event - NETWORK FIRST for index.html (auto-update), CACHE FIRST for others
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // NETWORK-FIRST strategy for index.html (check GitHub first!)
  if (event.request.url.endsWith('index.html') || event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the fresh response
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            console.log('✅ App updated from GitHub!');
            return response;
          }
          return response;
        })
        .catch(err => {
          // Network failed, use cached version
          console.log('📡 Offline - serving cached version');
          return caches.match(event.request)
            .then(response => response || caches.match('./index.html'));
        })
    );
    return;
  }

  // CACHE-FIRST strategy for other files (faster, update in background)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Serve from cache
          return response;
        }

        // Not in cache, fetch from network
        return fetch(event.request)
          .then(response => {
            // Validate response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cache successful response
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(err => {
            // Offline - return cached version
            return caches.match(event.request);
          });
      })
  );
});

// Listen for messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle background sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(Promise.resolve());
  }
});

console.log('✅ Service Worker loaded - Auto-update enabled!');
console.log('📱 App will check GitHub every time it opens');
console.log('🔄 Latest version will load automatically');
