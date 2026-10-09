import { Platform } from 'react-native';
import { createAnimeXinAdapter } from '../../backend/src/providers/animexin/core';
import { createDonghuaStreamAdapter } from '../../backend/src/providers/donghuastream/core';
const origins = new Set([
  'https://animexin.dev',
  'https://donghuastream.org',
  'https://www.mediafire.com',
  'https://rumble.com',
]);
/** Native public-page transport, using the same parsers and host checks as the gateway. */
export function directAnimeAdapter(id: string, signal?: AbortSignal) {
  const sourceText = async (origin: string, path: string): Promise<string> => {
    const url = new URL(path, origin);
    if (!origins.has(origin) || url.origin !== origin || url.username || url.password)
      throw new Error('Unsupported anime source URL.');
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 20000);
    try {
      const response = await fetch(url.href, {
        signal: controller.signal,
        redirect: 'error',
        headers: { Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
      });
      if (!response.ok) throw new Error(`Direct source HTTP ${response.status}.`);
      if (Number(response.headers.get('content-length')) > 5000000)
        throw new Error('Source response too large.');
      const html = await response.text();
      if (html.length > 5000000) throw new Error('Source response too large.');
      if (/cf-chl-|<title>Just a moment/i.test(html))
        throw new Error('Source requires browser verification.');
      return html;
    } catch (error) {
      if (signal?.aborted) {
        const cancelled = new Error('Request cancelled.');
        cancelled.name = 'AbortError';
        throw cancelled;
      }
      if (controller.signal.aborted) throw new Error('Direct anime source timed out.');
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  };
  if (Platform.OS === 'web') return undefined;
  return id === 'animexin'
    ? createAnimeXinAdapter(sourceText)
    : id === 'donghuastream'
      ? createDonghuaStreamAdapter(sourceText)
      : undefined;
}
export async function withDirectAnimeFallback<T>(
  gateway: () => Promise<T>,
  direct: (() => Promise<T>) | undefined,
  signal?: AbortSignal,
): Promise<T> {
  try {
    return await gateway();
  } catch (error) {
    const failure = error as { name?: string; status?: number; code?: string };
    if (
      !direct ||
      signal?.aborted ||
      failure.name === 'AbortError' ||
      [400, 401, 404, 429].includes(failure.status ?? -1) ||
      ['PROVIDER_DISABLED', 'CONTENT_LOCKED', 'SOURCE_RATE_LIMITED', 'SOURCE_DAILY_LIMIT'].includes(
        failure.code ?? '',
      )
    )
      throw error;
    try {
      return await direct();
    } catch (directError) {
      if (signal?.aborted || (directError as Error).name === 'AbortError') throw directError;
      throw new Error(
        `Gateway: ${error instanceof Error ? error.message : 'Unavailable'}. Direct: ${directError instanceof Error ? directError.message : 'Unavailable'}`,
      );
    }
  }
}
