/** Shared design token values used by Tailwind and TypeScript theme modules. */

const palette = {
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
  rose: {
    500: '#f43f5e',
    600: '#e11d48',
  },
  amber: {
    500: '#f59e0b',
    600: '#d97706',
  },
  emerald: {
    500: '#10b981',
    600: '#059669',
  },
  red: {
    500: '#ef4444',
    600: '#dc2626',
  },
  green: {
    500: '#22c55e',
    600: '#16a34a',
  },
  blue: {
    500: '#3b82f6',
    600: '#2563eb',
  },
};

const spacing = {
  0: 0,
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
};

const borderRadius = {
  none: 0,
  sm: 4,
  DEFAULT: 8,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

const fontSize = {
  xs: ['12px', { lineHeight: '16px', letterSpacing: '0.01em' }],
  sm: ['14px', { lineHeight: '20px', letterSpacing: '0.005em' }],
  base: ['16px', { lineHeight: '24px', letterSpacing: '0' }],
  lg: ['18px', { lineHeight: '28px', letterSpacing: '-0.005em' }],
  xl: ['20px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
  '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.015em' }],
  '3xl': ['30px', { lineHeight: '36px', letterSpacing: '-0.02em' }],
  '4xl': ['36px', { lineHeight: '40px', letterSpacing: '-0.025em' }],
};

const fontFamily = {
  sans: ['System'],
  mono: ['SpaceMono'],
};

module.exports = {
  palette,
  spacing,
  borderRadius,
  fontSize,
  fontFamily,
};
