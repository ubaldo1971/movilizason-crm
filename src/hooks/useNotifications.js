import { useState, useEffect, useCallback, useRef } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, arrayUnion, serverTimestamp } from '../lib/dbService';
import { app, db } from '../firebaseConfig';

// VAPID key is generated in Firebase Console > Project Settings > Cloud Messaging
// For now, we'll use a placeholder that gets replaced when you generate one
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

/**
 * Hook for managing push notifications via Firebase Cloud Messaging
 * Handles: permission request, token management, foreground messages, SW registration
 */
export function useNotifications(userId) {
  const [permission, setPermission] = useState(Notification.permission || 'default');
  const [fcmToken, setFcmToken] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(true);
  const [latestNotification, setLatestNotification] = useState(null);
  const messagingRef = useRef(null);
  const unsubForegroundRef = useRef(null);

  // Check if notifications are supported
  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    setPermission(Notification.permission);
    setLoading(false);
  }, []);

  // Register Service Worker and initialize FCM
  const initializeFCM = useCallback(async () => {
    if (!isSupported) return null;

    try {
      // Register the Firebase Messaging Service Worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      console.log('[Notifications] Service Worker registered:', registration.scope);

      // Wait for SW to be ready
      await navigator.serviceWorker.ready;

      // Initialize Firebase Messaging
      const messaging = getMessaging(app);
      messagingRef.current = messaging;

      return { messaging, registration };
    } catch (error) {
      console.error('[Notifications] FCM initialization failed:', error);
      return null;
    }
  }, [isSupported]);

  // Request notification permission + get FCM token
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn('[Notifications] Not supported in this browser');
      return null;
    }

    try {
      // Request browser permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        console.warn('[Notifications] Permission denied:', result);
        return null;
      }

      // Initialize FCM if needed
      const fcm = await initializeFCM();
      if (!fcm) return null;

      // Get FCM registration token
      let token = null;
      if (VAPID_KEY) {
        token = await getToken(fcm.messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: fcm.registration
        });
      } else {
        // Without VAPID key, still register SW for local notifications
        token = await getToken(fcm.messaging, {
          serviceWorkerRegistration: fcm.registration
        });
      }

      if (token) {
        setFcmToken(token);
        console.log('[Notifications] FCM Token obtained:', token.substring(0, 20) + '...');

        // Save token to Firestore for this user
        if (userId) {
          await saveTokenToFirestore(userId, token);
        }
      }

      return token;
    } catch (error) {
      console.error('[Notifications] Error requesting permission:', error);
      return null;
    }
  }, [isSupported, userId, initializeFCM]);

  // Save FCM token to user's Firestore document
  const saveTokenToFirestore = async (uid, token) => {
    try {
      const tokenRef = doc(db, 'users', uid);
      await setDoc(tokenRef, {
        fcmTokens: arrayUnion(token),
        lastTokenUpdate: serverTimestamp(),
        notificationsEnabled: true
      }, { merge: true });
      console.log('[Notifications] Token saved to Firestore');
    } catch (error) {
      console.error('[Notifications] Error saving token:', error);
    }
  };

  // Listen for foreground messages (app is open and focused)
  useEffect(() => {
    if (!messagingRef.current) return;

    const unsubscribe = onMessage(messagingRef.current, (payload) => {
      console.log('[Notifications] Foreground message received:', payload);

      setLatestNotification({
        title: payload.notification?.title || payload.data?.title || 'Nuevo mensaje',
        body: payload.notification?.body || payload.data?.body || '',
        data: payload.data || {},
        receivedAt: new Date()
      });

      // Show local notification even when focused (for visibility)
      if (Notification.permission === 'granted') {
        const notification = new Notification(
          payload.notification?.title || '📢 MovilizaSon', 
          {
            body: payload.notification?.body || payload.data?.body || 'Tienes un nuevo mensaje',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: payload.data?.conversationId || 'foreground',
            requireInteraction: payload.data?.isAlarm === 'true',
            vibrate: [300, 100, 300]
          }
        );

        notification.onclick = () => {
          window.focus();
          notification.close();
          if (payload.data?.url) {
            window.location.href = payload.data.url;
          }
        };

        // Auto-close after 8 seconds (unless alarm)
        if (payload.data?.isAlarm !== 'true') {
          setTimeout(() => notification.close(), 8000);
        }
      }
    });

    unsubForegroundRef.current = unsubscribe;
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [messagingRef.current]);

  // Listen for messages from Service Worker (notification clicks)
  useEffect(() => {
    const handleSWMessage = (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        console.log('[Notifications] SW notification click:', event.data);
        const url = event.data.url;
        if (url && window.location.pathname !== url) {
          window.location.href = url;
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleSWMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, []);

  // Send a local test notification
  const sendTestNotification = useCallback(() => {
    if (Notification.permission !== 'granted') {
      console.warn('No notification permission');
      return;
    }

    const notif = new Notification('🔔 MovilizaSon — Prueba', {
      body: 'Las notificaciones están funcionando correctamente. ¡Recibirás alertas de tareas y mensajes!',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'test-notification',
      requireInteraction: false,
      vibrate: [200, 100, 200]
    });

    setTimeout(() => notif.close(), 5000);
  }, []);

  return {
    permission,
    fcmToken,
    isSupported,
    loading,
    latestNotification,
    requestPermission,
    sendTestNotification,
    isEnabled: permission === 'granted' && !!fcmToken
  };
}
