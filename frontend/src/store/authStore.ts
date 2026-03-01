import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

const DEV_BYPASS = import.meta.env.DEV && !import.meta.env.VITE_SUPABASE_ANON_KEY?.startsWith('eyJ');

const DEV_USER = {
  id: 'dev-user-000',
  email: 'dev@coconutflow.local',
  user_metadata: { full_name: 'Dev User' },
} as unknown as User;

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  init: async () => {
    if (DEV_BYPASS) {
      console.warn('[Auth] Dev bypass active — no valid Supabase anon key detected');
      set({ user: DEV_USER, session: null, loading: false });
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    set({ user: session?.user ?? null, session, loading: false });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, session });
    });
  },
  signIn: async (email, password) => {
    if (DEV_BYPASS) {
      set({ user: DEV_USER, session: null });
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
  signUp: async (email, password) => {
    if (DEV_BYPASS) {
      set({ user: DEV_USER, session: null });
      return;
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  },
  signOut: async () => {
    if (DEV_BYPASS) {
      set({ user: null, session: null });
      return;
    }
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
  signInWithGoogle: async () => {
    if (DEV_BYPASS) {
      set({ user: DEV_USER, session: null });
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  },
}));
