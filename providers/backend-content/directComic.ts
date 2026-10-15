import { nativeSourceText } from './nativeSourceText';
import { Platform } from 'react-native';
import { createWeebCentralAdapter } from '../../backend/src/providers/weebcentral/core';
import { createDemonicScansAdapter } from '../../backend/src/providers/demonicscans/core';
import { createKaliscanAdapter } from '../../backend/src/providers/kaliscan/core';
import { withDirectAnimeFallback } from './directAnime';
const origins: Record<string, string> = {
  weebcentral: 'https://weebcentral.com',
  demonicscans: 'https://demonicscans.org',
  kaliscan: 'https://kaliscan.io',
  mangajinx: 'https://mgjinx.com',
};
/** Device-side normal HTTP fallback; the exact same parser preserves provider-scoped IDs. */
export function directComicAdapter(id: string, signal?: AbortSignal) {
  if (Platform.OS === 'web' || !origins[id]) return undefined;
  const text = nativeSourceText(origins[id], signal);
  return id === 'weebcentral'
    ? createWeebCentralAdapter(text)
    : id === 'demonicscans'
      ? createDemonicScansAdapter(text)
      : createKaliscanAdapter(id, id === 'kaliscan' ? 'Kaliscan' : 'MangaJinx', origins[id], text);
}
export function withDirectComicFallback<T>(
  gateway: () => Promise<T>,
  direct: (() => Promise<T>) | undefined,
  signal?: AbortSignal,
): Promise<T> {
  return direct ? withDirectAnimeFallback(direct, gateway, signal) : gateway();
}
