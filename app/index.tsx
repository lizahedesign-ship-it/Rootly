import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../src/theme';
import { supabase } from '../src/services/supabase';
import { useAuthStore } from '../src/store/authStore';

/**
 * Loading gate — checks session, then routes:
 *
 *   No session                                     → /(auth)/login
 *   Session + child profiles exist in Supabase     → /(parent)/(tabs)/home  (skip onboarding)
 *   Session + no children + onboarding_complete    → /(parent)/(tabs)/home
 *   Session + no children + no flag                → /onboarding
 *
 * Ongoing session changes (expiry, sign-out) are handled by
 * the onAuthStateChange listener in app/_layout.tsx.
 */
export default function IndexScreen() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);

      if (!session) {
        router.replace('/(auth)/login');
        return;
      }

      // If the parent already has child profiles, skip onboarding entirely.
      const { data: profiles } = await supabase
        .from('child_profile')
        .select('id')
        .eq('parent_id', session.user.id)
        .limit(1);

      if (profiles && profiles.length > 0) {
        router.replace('/(parent)/(tabs)/home');
        return;
      }

      // No children — fall back to the onboarding flag.
      const done = await AsyncStorage.getItem('onboarding_complete');
      if (done) {
        router.replace('/(parent)/(tabs)/home');
      } else {
        router.replace('/onboarding');
      }
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={Colors.green600} />
    </View>
  );
}
