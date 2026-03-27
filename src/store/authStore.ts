import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
  currentUser: User | null;
  session: Session | null;
  isLoggedIn: boolean;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  session: null,
  isLoggedIn: false,
  setSession: (session) =>
    set({
      session,
      currentUser: session?.user ?? null,
      isLoggedIn: !!session,
    }),
}));
