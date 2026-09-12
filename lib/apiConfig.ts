import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Resolves the backend base URL for web / emulator / simulator / device.
 * Override with EXPO_PUBLIC_API_URL (no trailing slash), e.g.:
 *   EXPO_PUBLIC_API_URL=http://192.168.1.20:5000
 */
export function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
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
    // Android emulator maps host loopback to 10.0.2.2
    return 'http://10.0.2.2:5000';
  }

  return 'http://localhost:5000';
}
