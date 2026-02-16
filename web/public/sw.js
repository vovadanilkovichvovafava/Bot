const CACHE_NAME = 'ai-betting-bot-v2';
const urlsToCache = [
  '/',
  '/index.html',
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ============================================
// Push Notification Handling
// ============================================

// Receive push notification
self.addEventListener('push', event => {
  console.log('[SW] Push received:', event);

  let data = {
    title: 'PVA Betting',
    body: 'You have a new notification',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'default',
    data: { url: '/' },
  };

  // Parse push data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      // If not JSON, use text as body
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

  // Add image if provided (for rich notifications)
  if (data.image) {
    options.image = data.image;
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click:', event.action, event.notification.data);

  event.notification.close();

  const notificationData = event.notification.data || {};
  let targetUrl = notificationData.url || '/';

  // Handle different actions
  if (event.action === 'view' || event.action === 'claim') {
    targetUrl = notificationData.url || '/';
  } else if (event.action === 'dismiss' || event.action === 'later') {
    // Just close the notification
    return;
  }

  // Handle specific notification types
  if (notificationData.type === 'match_reminder' && notificationData.matchId) {
    targetUrl = `/match/${notificationData.matchId}`;
  } else if (notificationData.type === 'value_bet' && notificationData.matchId) {
    targetUrl = `/match/${notificationData.matchId}`;
  } else if (notificationData.type === 're_engagement') {
    targetUrl = notificationData.teamId ? `/matches?team=${notificationData.teamId}` : '/';
  }

  // Open the app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          // Navigate existing window
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: targetUrl,
            data: notificationData,
          });
          return client.focus();
        }
      }
      // No window open - open new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle notification close (for analytics)
self.addEventListener('notificationclose', event => {
  console.log('[SW] Notification closed:', event.notification.tag);
  // Could track this for analytics
});

// Listen for messages from main app
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
