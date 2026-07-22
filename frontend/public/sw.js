// Fire Surveillance System - Service Worker for Push Notifications

const CACHE_NAME = 'fire-surveillance-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let data = {
    title: '🔥 Fire Alert!',
    body: 'Fire has been detected in the monitored area.',
    icon: '/fire-icon.png',
    badge: '/fire-badge.png',
    tag: 'fire-alert',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: '/',
      timestamp: Date.now()
    }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/fire-icon.png',
      badge: data.badge || '/fire-badge.png',
      tag: data.tag || 'fire-alert',
      requireInteraction: data.requireInteraction !== false,
      vibrate: data.vibrate || [200, 100, 200],
      actions: [
        { action: 'view', title: 'View Detection' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      data: data.data
    })
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            // Navigate to detection page
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              action: event.action,
              data: event.notification.data
            });
            return;
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow('/detection');
        }
      })
  );
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, data } = event.data;
    
    self.registration.showNotification(title || '🔥 Fire Alert!', {
      body: body || 'Fire has been detected!',
      icon: '/fire-icon.png',
      badge: '/fire-badge.png',
      tag: 'fire-alert-' + Date.now(),
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      actions: [
        { action: 'view', title: 'View Detection' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      data: data || { url: '/detection', timestamp: Date.now() }
    });
  }
});
