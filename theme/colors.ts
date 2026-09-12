import { palette } from './tokens';

export { palette };

export type ColorScheme = 'light' | 'dark';

export type SemanticColors = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
  ring: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  warning: string;
  info: string;
  anime: string;
  manga: string;
  novel: string;
  tabIconDefault: string;
  tabIconSelected: string;
};

export const lightColors: SemanticColors = {
  background: palette.neutral[50],
  foreground: palette.neutral[900],
  card: '#ffffff',
  cardForeground: palette.neutral[900],
  primary: palette.primary[600],
  primaryForeground: '#ffffff',
  secondary: palette.neutral[100],
  secondaryForeground: palette.neutral[900],
  muted: palette.neutral[100],
  mutedForeground: palette.neutral[500],
  accent: palette.primary[50],
  accentForeground: palette.primary[700],
  border: palette.neutral[200],
  input: palette.neutral[200],
  ring: palette.primary[500],
  destructive: palette.red[500],
  destructiveForeground: '#ffffff',
  success: palette.green[500],
  warning: palette.amber[500],
  info: palette.blue[500],
  anime: palette.rose[500],
  manga: palette.amber[500],
  novel: palette.emerald[500],
  tabIconDefault: palette.neutral[400],
  tabIconSelected: palette.primary[600],
};

export const darkColors: SemanticColors = {
  background: palette.neutral[950],
  foreground: palette.neutral[50],
  card: palette.neutral[900],
  cardForeground: palette.neutral[50],
  primary: palette.primary[400],
  primaryForeground: palette.neutral[950],
  secondary: palette.neutral[800],
  secondaryForeground: palette.neutral[50],
  muted: palette.neutral[800],
  mutedForeground: palette.neutral[400],
  accent: palette.primary[950],
  accentForeground: palette.primary[300],
  border: palette.neutral[800],
  input: palette.neutral[800],
  ring: palette.primary[400],
  destructive: palette.red[500],
  destructiveForeground: '#ffffff',
  success: palette.green[500],
  warning: palette.amber[500],
  info: palette.blue[500],
  anime: palette.rose[500],
  manga: palette.amber[500],
  novel: palette.emerald[500],
  tabIconDefault: palette.neutral[500],
  tabIconSelected: palette.primary[400],
};

export const colors = {
  light: lightColors,
  dark: darkColors,
};

export function getColors(scheme: ColorScheme): SemanticColors {
  return colors[scheme];
}
