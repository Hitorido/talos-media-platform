import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { useColorScheme } from '@/components/useColorScheme';
import { createTheme, type ColorScheme, type Theme } from '@/theme';

type ThemeContextValue = {
  colorScheme: ColorScheme;
  isDark: boolean;
  theme: Theme;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type AppThemeProviderProps = {
  children: ReactNode;
};

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const systemScheme = useColorScheme();
  const colorScheme: ColorScheme = systemScheme === 'dark' ? 'dark' : 'light';

  const value = useMemo(
    () => ({
      colorScheme,
      isDark: colorScheme === 'dark',
      theme: createTheme(colorScheme),
    }),
    [colorScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }

  return context;
}
