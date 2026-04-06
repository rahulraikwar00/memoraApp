import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { darkColors, lightColors, spacing, typography, borderRadius } from '../constants/theme';

// Custom storage adapter for Expo SecureStore
const SecureStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await SecureStore.getItemAsync(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

export type ThemeColors = typeof darkColors;

interface ThemeState {
  isDark: boolean;
  colors: ThemeColors;
  spacing: typeof spacing;
  typography: typeof typography;
  borderRadius: typeof borderRadius;
  toggleTheme: () => void;
  setDark: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: true,
      colors: darkColors,
      spacing,
      typography,
      borderRadius,
      toggleTheme: () => set((state) => ({
        isDark: !state.isDark,
        colors: state.isDark ? lightColors : darkColors
      })),
      setDark: (dark: boolean) => set({ 
        isDark: dark,
        colors: dark ? darkColors : lightColors
      }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => SecureStorage),
      // Only persist the isDark flag
      partialize: (state) => ({ isDark: state.isDark }),
      onRehydrateStorage: () => {
        console.log('useThemeStore: Hydration starting...');
        return (state, error) => {
          if (error) {
            console.error('useThemeStore: Hydration error:', error);
          } else {
            console.log('useThemeStore: Hydration finished successfully');
            if (state) {
              state.colors = state.isDark ? darkColors : lightColors;
            }
          }
        };
      },
    }
  )
);

export { darkColors, lightColors, spacing, typography, borderRadius };
