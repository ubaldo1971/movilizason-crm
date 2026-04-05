/* eslint-disable no-undef */
// Firebase Messaging Service Worker
// This runs in the background and handles push notifications when the app is closed

importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDvf6SWDYxdUyvNm4xqR0R7yc5i8RvMhGs",
  authDomain: "movilizason-crm-ubaldo.firebaseapp.com",
  projectId: "movilizason-crm-ubaldo",
  storageBucket: "movilizason-crm-ubaldo.firebasestorage.app",
  messagingSenderId: "1007940051790",
  appId: "1:1007940051790:web:e13b7ace132438df3c741f"
});

const messaging = firebase.messaging();

// Handle background messages (when app is not focused)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || '📢 MovilizaSon';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Tienes un nuevo mensaje',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.data?.conversationId || 'general',
    renotify: true,
    requireInteraction: true, // Notification stays until user interacts
    vibrate: [500, 200, 500, 200, 500],
    data: {
      url: payload.data?.url || '/messages',
      conversationId: payload.data?.conversationId || null,
      messageType: payload.data?.messageType || 'communication',
      isAlarm: payload.data?.isAlarm === 'true'
    },
    actions: [
      { action: 'open', title: '📬 Abrir' },
      { action: 'dismiss', title: '✖ Cerrar' }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — open the app and navigate
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/messages';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: targetUrl,
            conversationId: event.notification.data?.conversationId,
            isAlarm: event.notification.data?.isAlarm
          });
          return;
        }
      }
      // Otherwise open a new window
      return clients.openWindow(targetUrl);
    })
  );
});

// Handle service worker install — take control immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(clients.claim());
});
