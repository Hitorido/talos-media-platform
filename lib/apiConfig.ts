import Constants from 'expo-constants';
import { Platform } from 'react-native';

const PRODUCTION_API_URL = 'https://talos-media-platform.onrender.com';

/**
 * Resolves the Talos backend base URL.
 * Release/preview builds use the Render production host unless EXPO_PUBLIC_API_URL overrides it.
 * Web always prefers Render when no explicit override is set (browsers cannot use LAN emulator aliases).
 */
export function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl?.trim();
  if (fromExtra) {
    return fromExtra.replace(/\/$/, '');
  }

  // Release bundles and web must never fall back to a developer LAN host.
  if ((typeof __DEV__ !== 'undefined' && !__DEV__) || Platform.OS === 'web') {
    return PRODUCTION_API_URL;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.experienceUrl ??
    (Constants as { linkingUri?: string }).linkingUri;

  if (typeof hostUri === 'string' && hostUri.length > 0) {
    try {
      const normalized = hostUri.includes('://') ? hostUri : `http://${hostUri}`;
      const { hostname } = new URL(normalized);
      if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return `http://${hostname}:5000`;
      }
    } catch {
      // Fall through to platform defaults.
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  return PRODUCTION_API_URL;
}
