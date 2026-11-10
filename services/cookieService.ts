import * as SecureStore from 'expo-secure-store';

const CF_CLEARANCE_PREFIX = 'cf_clearance_';

export async function setCloudflareCookie(domain: string, cookie: string): Promise<void> {
  const key = `${CF_CLEARANCE_PREFIX}${domain}`;
  await SecureStore.setItemAsync(key, cookie);
}

export async function getCloudflareCookie(domain: string): Promise<string | null> {
  const key = `${CF_CLEARANCE_PREFIX}${domain}`;
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function clearCloudflareCookie(domain: string): Promise<void> {
  const key = `${CF_CLEARANCE_PREFIX}${domain}`;
  await SecureStore.deleteItemAsync(key);
}

export async function clearAllCloudflareCookies(): Promise<void> {
  // This would require enumerating all keys, which SecureStore doesn't support
  // For now, individual domains should be cleared when needed
}
