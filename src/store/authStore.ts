import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

type AuthState = {
  currentUser: User | null;
  session: Session | null;
  isLoggedIn: boolean;
  /** true after the first getSession / onAuthStateChange result arrives */
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
};

type AuthActions = {
  setSession: (session: Session | null) => void;
  clearError: () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Returns whether email verification is pending */
  signUpWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ needsVerification: boolean }>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  currentUser: null,
  session: null,
  isLoggedIn: false,
  isInitialized: false,
  isLoading: false,
  error: null,

  // Called by onAuthStateChange in app/_layout.tsx + by index.tsx getSession()
  setSession: (session) =>
    set({
      session,
      currentUser: session?.user ?? null,
      isLoggedIn: !!session,
      isInitialized: true,
    }),

  clearError: () => set({ error: null }),

  // ── Email / Password ─────────────────────────────────────────────────────
  signInWithEmail: async (email, password) => {
    set({ isLoading: true, error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ isLoading: false });
    if (error) set({ error: error.message });
    // Session update handled by onAuthStateChange in app/_layout.tsx
  },

  signUpWithEmail: async (email, password) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signUp({ email, password });
    set({ isLoading: false });
    if (error) {
      set({ error: error.message });
      return { needsVerification: false };
    }
    // No session means Supabase requires email confirmation
    return { needsVerification: !data.session };
  },

  // ── Apple Sign In (iOS only) ──────────────────────────────────────────────
  signInWithApple: async () => {
    set({ isLoading: true, error: null });
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken!,
      });
      if (error) set({ error: error.message });
    } catch (e: unknown) {
      const err = e as { code?: string };
      // ERR_REQUEST_CANCELED = user dismissed the sheet; don't show an error
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        set({ error: 'Apple Sign In failed. Please try again.' });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Google OAuth via WebBrowser ───────────────────────────────────────────
  // Requires Google OAuth configured in Supabase dashboard.
  // Redirect URI (rootly://auth/callback) must be registered there.
  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const redirectUri = Linking.createURL('/auth/callback');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUri, skipBrowserRedirect: true },
      });

      if (error || !data.url) {
        set({ error: error?.message ?? 'Google Sign In failed.', isLoading: false });
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      if (result.type === 'success' && result.url) {
        // Supabase returns tokens in the URL hash fragment
        const fragment = result.url.split('#')[1] ?? '';
        const params: Record<string, string> = {};
        fragment.split('&').forEach((pair) => {
          const [k, v] = pair.split('=');
          if (k && v) params[k] = decodeURIComponent(v);
        });

        if (params.access_token && params.refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (sessionError) set({ error: sessionError.message });
          // onAuthStateChange fires → setSession() → isLoggedIn = true
        } else {
          set({ error: 'Google Sign In failed. Please try again.' });
        }
      }
      // result.type === 'cancel' means user closed browser — no error shown
    } catch {
      set({ error: 'Google Sign In failed. Please try again.' });
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Sign Out ──────────────────────────────────────────────────────────────
  signOut: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({ isLoading: false });
    // Session cleared by onAuthStateChange → setSession(null) → isLoggedIn = false
  },
}));
