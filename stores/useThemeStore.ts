import { create } from 'zustand';
import { darkColors, lightColors, spacing, typography, borderRadius } from '../constants/theme';

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

export const useThemeStore = create<ThemeState>((set) => ({
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
}));

export { darkColors, lightColors, spacing, typography, borderRadius };
