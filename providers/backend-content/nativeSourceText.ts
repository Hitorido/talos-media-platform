/** A bounded, fixed-origin transport for normal public requests from native apps. */
export function nativeSourceText(allowedOrigin: string, signal?: AbortSignal) {
  return async (origin: string, path: string, method: 'GET' | 'POST' = 'GET') => {
    const url = new URL(path, origin);
    if (origin !== allowedOrigin || url.origin !== origin || url.username || url.password)
      throw new Error('Invalid comic source URL.');
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 12000);
    try {
      const response = await fetch(url.href, {
        method,
        signal: controller.signal,
        redirect: 'error',
        headers: { Accept: 'text/html' },
      });
      if (!response.ok)
        throw Object.assign(new Error(`Direct comic source HTTP ${response.status}.`), {
          status: response.status,
          code: response.status === 429 ? 'SOURCE_RATE_LIMITED' : 'SOURCE_BLOCKED',
        });
      if (Number(response.headers.get('content-length')) > 5000000)
        throw new Error('Source response too large.');
      const html = await response.text();
      if (html.length > 5000000) throw new Error('Source response too large.');
      return html;
    } catch (error) {
      if (signal?.aborted) {
        const cancelled = new Error('Request cancelled.');
        cancelled.name = 'AbortError';
        throw cancelled;
      }
      if (controller.signal.aborted) throw new Error('Direct comic source timed out.');
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  };
}
