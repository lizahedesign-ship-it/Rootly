import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../services/supabase';
import { flushQueue } from '../services/offlineQueue';

/**
 * App-lifetime hook. Call once from the root layout.
 *
 * On mount: flush any completions queued during a previous app session.
 * On reconnect: flush the queue whenever network connectivity is restored.
 */
export function useOfflineSync() {
  useEffect(() => {
    // Flush once on mount — handles items queued while the app was closed.
    flushQueue(supabase).catch(() => {});

    // Subscribe to network changes. Flush whenever connectivity is restored.
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline =
        state.isConnected === true && state.isInternetReachable !== false;
      if (isOnline) {
        flushQueue(supabase).catch(() => {});
      }
    });

    return unsubscribe;
  }, []);
}
