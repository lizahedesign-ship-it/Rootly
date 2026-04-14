import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

/**
 * Protected layout for all parent screens.
 * Redirects to login when the session expires or the user signs out.
 */
export default function ParentLayout() {
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    // Guard against the initial uninitialized state (isLoggedIn defaults to false
    // before getSession() resolves — we don't want to redirect then).
    if (isInitialized && !isLoggedIn) {
      router.replace('/(auth)/login');
    }
  }, [isLoggedIn, isInitialized]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
