import { useEffect, useRef } from 'react';
import { doc, setDoc, serverTimestamp } from '../lib/dbService';
import { db } from '../firebaseConfig';
import { useRole } from '../context/RoleContext';

export function useRealtimeTracking() {
  const { currentUser } = useRole();
  const watchId = useRef(null);
  const lastUpdate = useRef(0);
  const UPDATE_INTERVAL = 15000; // 15 seconds

  useEffect(() => {
    // Only track if user is logged in and has completed onboarding
    if (!currentUser?.uid || currentUser.uid === 'mock' || !currentUser.onboardingCompleted) {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      return;
    }

    const startTracking = () => {
      if (!navigator.geolocation) {
        console.error('Geolocation is not supported by your browser');
        return;
      }

      watchId.current = navigator.geolocation.watchPosition(
        async (position) => {
          const now = Date.now();
          // Throttling to avoid excessive Firestore writes
          if (now - lastUpdate.current < UPDATE_INTERVAL) return;

          const { latitude, longitude, heading, speed } = position.coords;
          
          try {
            await setDoc(doc(db, 'active_locations', currentUser.uid), {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Anon',
              surname: currentUser.surname || '',
              role: currentUser.role || 'Brigadista',
              brigadeId: currentUser.brigadeId || 'unassigned',
              lat: latitude,
              lng: longitude,
              heading: heading || 0,
              speed: speed || 0,
              lastUpdate: serverTimestamp(),
              status: 'online'
            });
            lastUpdate.current = now;
          } catch (err) {
            console.error('Error updating real-time location:', err);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };

    startTracking();

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [currentUser?.uid, currentUser?.onboardingCompleted, currentUser?.role]);

  return null;
}
