import { borderRadius } from './tokens';

export { borderRadius };

export type RadiusToken = keyof typeof borderRadius;

export const radiusTokens = {
  sm: borderRadius.sm,
  md: borderRadius.md,
  lg: borderRadius.lg,
  xl: borderRadius.xl,
  '2xl': borderRadius['2xl'],
  full: borderRadius.full,
} as const;
