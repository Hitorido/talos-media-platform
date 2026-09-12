import { colors } from '@/theme/colors';

/** @deprecated Prefer theme tokens from `@/theme` and UI components from `@/components/ui`. */
export default {
  light: {
    text: colors.light.foreground,
    background: colors.light.background,
    tint: colors.light.primary,
    tabIconDefault: colors.light.tabIconDefault,
    tabIconSelected: colors.light.tabIconSelected,
  },
  dark: {
    text: colors.dark.foreground,
    background: colors.dark.background,
    tint: colors.dark.primary,
    tabIconDefault: colors.dark.tabIconDefault,
    tabIconSelected: colors.dark.tabIconSelected,
  },
};
