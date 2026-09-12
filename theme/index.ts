import { colors, getColors, type ColorScheme, type SemanticColors } from './colors';
import { radiusTokens, borderRadius } from './radius';
import { shadows, getShadowStyle, type ShadowToken } from './shadows';
import { spacing, spacingTokens } from './spacing';
import { palette, fontFamily, fontSize, borderRadius as radiusScale } from './tokens';
import { typography, typographyVariants, type TypographyVariant } from './typography';

export type Theme = {
  scheme: ColorScheme;
  colors: SemanticColors;
  spacing: typeof spacing;
  spacingTokens: typeof spacingTokens;
  borderRadius: typeof borderRadius;
  radiusTokens: typeof radiusTokens;
  typography: typeof typography;
  shadows: typeof shadows;
};

export function createTheme(scheme: ColorScheme): Theme {
  return {
    scheme,
    colors: getColors(scheme),
    spacing,
    spacingTokens,
    borderRadius,
    radiusTokens,
    typography,
    shadows,
  };
}

export {
  colors,
  getColors,
  palette,
  spacing,
  spacingTokens,
  borderRadius,
  radiusTokens,
  radiusScale,
  typography,
  typographyVariants,
  shadows,
  getShadowStyle,
  fontFamily,
  fontSize,
};

export type { ColorScheme, SemanticColors, TypographyVariant, ShadowToken };
