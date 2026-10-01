import { useMediaBookmarkStore } from '@/stores/mediaBookmarkStore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../global.css';

import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { UpdateModal } from '@/components/UpdateModal';
import { useColorScheme } from '@/components/useColorScheme';
import { AppThemeProvider } from '@/providers/ThemeProvider';
import { bootstrapPersistence } from '@/services/persistenceBootstrap';
import { checkForUpdate, type VersionManifest } from '@/services/updateService';
import { getColors } from '@/theme';

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [hydrated, setHydrated] = useState(false);
  const [updateManifest, setUpdateManifest] = useState<VersionManifest | null>(null);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([bootstrapPersistence(), useMediaBookmarkStore.persist.rehydrate()])
      .catch((bootstrapError) => {
        // console.warn('[persistence] Failed to restore application state:', bootstrapError);
      })
      .finally(() => {
        if (!cancelled) {
          setHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loaded && hydrated) {
      SplashScreen.hideAsync();
    }
  }, [loaded, hydrated]);

  // Background update check — fires once after hydration, never blocks startup.
  // The /api/version endpoint may not exist yet; failure is silenced gracefully.
  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    checkForUpdate()
      .then((manifest) => {
        if (active && manifest) setUpdateManifest(manifest);
      })
      .catch(() => {
        /* silently ignore network/endpoint failures */
      });
    return () => {
      active = false;
    };
  }, [hydrated]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <RootLayoutNav />
        {updateManifest ? (
          <UpdateModal manifest={updateManifest} onDismiss={() => setUpdateManifest(null)} />
        ) : null}
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const themeColors = getColors(scheme);

  const navigationTheme =
    scheme === 'dark'
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: themeColors.background,
            card: themeColors.card,
            text: themeColors.foreground,
            border: themeColors.border,
            primary: themeColors.primary,
          },
        }
      : {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            background: themeColors.background,
            card: themeColors.card,
            text: themeColors.foreground,
            border: themeColors.border,
            primary: themeColors.primary,
          },
        };

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="anime" options={{ headerShown: false }} />
        <Stack.Screen name="manga" options={{ headerShown: false }} />
        <Stack.Screen name="novel" options={{ headerShown: false }} />
        <Stack.Screen name="sources" options={{ title: 'Sources' }} />
      </Stack>
    </ThemeProvider>
  );
}
