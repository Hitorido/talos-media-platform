import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { removePersistedState } from '@/services/persistenceService';

// Scope tokens to the backend; never send a local token to a different environment.
const tokenKey = () =>
  `talos.auth.${Array.from(getApiBaseUrl())
    .map((c) => c.charCodeAt(0).toString(16))
    .join('-')}`;
let webToken: string | null = null;

export async function readAuthToken(): Promise<string | null> {
  // Discard legacy plaintext auth. Existing users must log in once again.
  await removePersistedState('auth');
  return Platform.OS === 'web' ? webToken : SecureStore.getItemAsync(tokenKey());
}

export async function writeAuthToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    // SecureStore is native-only. Web sessions last for this page only.
    webToken = token;
  } else if (token) {
    await SecureStore.setItemAsync(tokenKey(), token);
  } else {
    await SecureStore.deleteItemAsync(tokenKey());
  }
}
