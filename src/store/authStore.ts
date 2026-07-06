import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

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
  signUpWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ needsVerification: boolean; emailExists: boolean; errorMessage: string | null }>;
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
      const emailExists =
        error.code === 'email_exists' || error.code === 'user_already_exists';
      return { needsVerification: false, emailExists, errorMessage: error.message };
    }
    // Supabase returns identities: [] when email confirmations are on and the
    // address is already registered — it silently "succeeds" to avoid enumeration.
    if (data.user?.identities?.length === 0) {
      return { needsVerification: false, emailExists: true, errorMessage: null };
    }
    return { needsVerification: !data.session, emailExists: false, errorMessage: null };
  },

  // ── Sign Out ──────────────────────────────────────────────────────────────
  signOut: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({ isLoading: false });
    // Session cleared by onAuthStateChange → setSession(null) → isLoggedIn = false
  },
}));
