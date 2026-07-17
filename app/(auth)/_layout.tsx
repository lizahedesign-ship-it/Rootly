import { useEffect } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

export default function AuthLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  // If a logged-in user somehow lands on an auth screen, redirect to home.
  // Skip on reset-password: a recovery deep link signs the user in via a
  // temporary session so they can set a new password, not to enter the app.
  useEffect(() => {
    if (isInitialized && isLoggedIn && pathname !== '/reset-password') {
      router.replace('/(parent)/(tabs)/home');
    }
  }, [isLoggedIn, isInitialized, pathname]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
