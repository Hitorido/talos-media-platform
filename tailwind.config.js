const { palette, spacing, borderRadius, fontSize, fontFamily } = require('./theme/primitives.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './hooks/**/*.{js,jsx,ts,tsx}',
    './providers/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: palette.primary,
        neutral: palette.neutral,
        rose: palette.rose,
        amber: palette.amber,
        emerald: palette.emerald,
        red: palette.red,
        green: palette.green,
        blue: palette.blue,
      },
      spacing,
      borderRadius,
      fontSize,
      fontFamily,
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.08)',
        md: '0 2px 6px rgba(0, 0, 0, 0.12)',
        lg: '0 4px 12px rgba(0, 0, 0, 0.16)',
        xl: '0 8px 20px rgba(0, 0, 0, 0.2)',
      },
    },
  },
  plugins: [],
};
