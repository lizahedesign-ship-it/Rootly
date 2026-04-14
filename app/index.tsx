import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../src/theme';
import { supabase } from '../src/services/supabase';
import { useAuthStore } from '../src/store/authStore';

/**
 * Loading gate — checks the stored session once and routes:
 *   session present  → /(parent)/home
 *   no session       → /(auth)/login
 *
 * Ongoing session changes (expiry, sign-out) are handled by
 * the onAuthStateChange listener in app/_layout.tsx.
 */
export default function IndexScreen() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        router.replace('/(parent)/home');
      } else {
        router.replace('/(auth)/login');
      }
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={Colors.green600} />
    </View>
  );
}
