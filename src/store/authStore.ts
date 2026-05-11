import { create } from 'zustand';

export interface User {
  id: string;
  email?: string;
}

export interface Session {
  user: User;
  access_token?: string;
}

interface AuthState {
  session: Session | null;
  setSession: (session: Session | null) => void;
  clearSession: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initialize as null to force the login screen
  session: null, 
  
  setSession: (session) => set({ session }),
  
  clearSession: () => set({ session: null }),
  
  signOut: async () => {
    const { supabase } = await import('../lib/supabase');
    await supabase.auth.signOut();
    set({ session: null });
  }
}));