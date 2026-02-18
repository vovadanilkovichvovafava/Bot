// Build version — changes on every deploy to trigger SW update
// IMPORTANT: Update this on each deployment or use build tool to inject
const SW_VERSION = 'mlseyj09';
const CACHE_NAME = 'ai-betting-bot-' + SW_VERSION;

const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// Install event — cache static assets, activate immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  // Don't wait for clients to close — activate immediately
  self.skipWaiting();
});

// Activate event — clean ALL old caches, claim clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => {
      // Notify all clients that a new version is available
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION });
        });
      });
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event — network-first for navigation & API, cache-first for static assets
self.addEventListener('fetch', event => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // NEVER cache API calls
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    return;
  }

  // Navigation requests (HTML pages) — always network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the latest version
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('/')))
    );
    return;
  }

  // Static assets (JS, CSS, images) — network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ============================================
// Push Notification Handling
// ============================================

// Receive push notification
self.addEventListener('push', event => {
  let data = {
    title: 'PVA Betting',
    body: 'You have a new notification',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'default',
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon.svg',
    badge: data.badge || '/icon.svg',
    tag: data.tag || 'default',
    vibrate: data.vibrate || [100, 50, 100],
    data: data.data || { url: '/' },
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
  };

  if (data.image) {
    options.image = data.image;
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  let targetUrl = notificationData.url || '/';

  if (event.action === 'view' || event.action === 'claim') {
    targetUrl = notificationData.url || '/';
  } else if (event.action === 'dismiss' || event.action === 'later') {
    return;
  }

  if (notificationData.type === 'match_reminder' && notificationData.matchId) {
    targetUrl = `/match/${notificationData.matchId}`;
  } else if (notificationData.type === 'value_bet' && notificationData.matchId) {
    targetUrl = `/match/${notificationData.matchId}`;
  } else if (notificationData.type === 're_engagement') {
    targetUrl = notificationData.teamId ? `/matches?team=${notificationData.teamId}` : '/';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: targetUrl,
            data: notificationData,
          });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', event => {
  // Analytics tracking placeholder
});

// Listen for messages from main app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
