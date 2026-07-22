import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
} from '@expo-google-fonts/outfit';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '../src/theme';
import { supabase } from '../src/services/supabase';
import { useAuthStore } from '../src/store/authStore';
import {
  setNotificationHandler,
  registerForPushNotifications,
} from '../src/services/notificationsService';
import { useOfflineSync } from '../src/hooks/useOfflineSync';
import { parseRecoveryTokensFromUrl } from '../src/utils/authLinking';

SplashScreen.preventAutoHideAsync();

// Must be set at module scope before any notification can arrive.
setNotificationHandler();

export default function RootLayout() {
  useOfflineSync();

  const router = useRouter();

  const setSession  = useAuthStore((s) => s.setSession);
  const isLoggedIn  = useAuthStore((s) => s.isLoggedIn);
  const currentUser = useAuthStore((s) => s.currentUser);

  const [fontsLoaded] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
  });

  // Persist auth listener for the entire app lifetime.
  // Handles session expiry: SIGNED_OUT fires → setSession(null)
  // → (parent)/_layout.tsx detects isLoggedIn=false → redirects to login.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Handle the rootzy://reset-password recovery deep link: establish the
  // temporary recovery session from its tokens, then route to the screen
  // that lets the user set a new password.
  useEffect(() => {
    const handleUrl = async (url: string) => {
      const tokens = parseRecoveryTokensFromUrl(url);
      if (!tokens) return;
      await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
      router.push('/(auth)/reset-password');
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);

  // Register push token when the parent is authenticated.
  // Fires on login and on every cold start where the session is already active.
  // Silently no-ops on simulator and when permission is denied.
  useEffect(() => {
    if (isLoggedIn && currentUser?.id) {
      registerForPushNotifications(currentUser.id);
    }
  }, [isLoggedIn, currentUser?.id]);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bgPrimary },
        }}
      >
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, headerShown: false }} />
      </Stack>
    </>
  );
}
