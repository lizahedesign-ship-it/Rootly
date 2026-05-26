import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '../src/theme';
import { supabase } from '../src/services/supabase';
import { useAuthStore } from '../src/store/authStore';
import {
  setNotificationHandler,
  registerForPushNotifications,
} from '../src/services/notificationsService';

SplashScreen.preventAutoHideAsync();

// Must be set at module scope before any notification can arrive.
setNotificationHandler();

export default function RootLayout() {
  const setSession  = useAuthStore((s) => s.setSession);
  const isLoggedIn  = useAuthStore((s) => s.isLoggedIn);
  const currentUser = useAuthStore((s) => s.currentUser);

  const [fontsLoaded] = useFonts({
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
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
      />
    </>
  );
}
