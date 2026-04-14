import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

export default function AuthLayout() {
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  // If a logged-in user somehow lands on an auth screen, redirect to home.
  useEffect(() => {
    if (isInitialized && isLoggedIn) {
      router.replace('/(parent)/home');
    }
  }, [isLoggedIn, isInitialized]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
