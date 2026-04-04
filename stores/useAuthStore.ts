import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setToken: (token: string | null) => Promise<void>;
  loadToken: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setToken: async (token: string | null) => {
    if (token) {
      await SecureStore.setItemAsync('auth_token', token);
      set({ token, isAuthenticated: true });
    } else {
      await SecureStore.deleteItemAsync('auth_token');
      set({ token: null, isAuthenticated: false });
    }
  },

  loadToken: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      set({ token, isAuthenticated: !!token, isLoading: false });
    } catch {
      set({ token: null, isAuthenticated: false, isLoading: false });
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    set({ token: null, isAuthenticated: false });
  },
}));
