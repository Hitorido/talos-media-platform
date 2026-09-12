import { spacing } from './tokens';

export { spacing };

export type SpacingToken = keyof typeof spacing;

export const spacingTokens = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[3],
  lg: spacing[4],
  xl: spacing[6],
  '2xl': spacing[8],
  '3xl': spacing[12],
} as const;
