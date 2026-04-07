export const darkColors = {
  background: '#060606',
  card: '#111111',
  elevated: '#181818',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textTertiary: '#707070',
  accent: '#6C63FF',
  accentLight: '#8B85FF',
  accentDark: '#5249CC',
  success: '#1DB954',
  warning: '#FFB800',
  danger: '#FF4444',
  border: 'rgba(255,255,255,0.06)',
  borderLight: 'rgba(255,255,255,0.1)',
  statusBar: 'light',
};

export const lightColors = {
  background: '#F5F5F5',
  card: '#FFFFFF',
  elevated: '#EEEEEE',
  textPrimary: '#1A1A1A',
  textSecondary: '#555555',
  textTertiary: '#888888',
  accent: '#6C63FF',
  accentLight: '#8B85FF',
  accentDark: '#5249CC',
  success: '#1DB954',
  warning: '#FFB800',
  danger: '#FF4444',
  border: 'rgba(0,0,0,0.08)',
  borderLight: 'rgba(0,0,0,0.12)',
  statusBar: 'dark',
};

export const colors = darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const typography = {
  hero: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  title: {
    fontSize: 18,
    fontWeight: '500' as const,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
};

export const borderRadius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 9999,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};
