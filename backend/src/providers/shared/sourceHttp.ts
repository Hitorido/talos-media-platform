import { ProviderGatewayError } from '../types.js';

const cache = new Map<string, { expires: number; text: string }>();
const pending = new Map<string, Promise<string>>();
const queues = new Map<string, Promise<unknown>>();

/** Fixed adapter-owned origins only. Never accept a caller-supplied URL. */
export async function sourceText(origin: string, path: string): Promise<string> {
  const url = new URL(path, origin);
  if (url.origin !== origin || url.username || url.password) throw new ProviderGatewayError('Invalid source path.', 400);
  const key = url.href;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.text;
  if (pending.has(key)) return pending.get(key)!;
  const previous = queues.get(origin) ?? Promise.resolve();
  const operation = previous.catch(() => undefined).then(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(key, { redirect: 'error', signal: controller.signal, headers: { Accept: 'text/html,application/json', 'User-Agent': 'Talos/1.0' } });
      if (!response.ok) throw new ProviderGatewayError(`Source HTTP ${response.status}.`, response.status === 404 ? 404 : 502, 'UPSTREAM_FAILED');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Empty response');
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.length;
        if (size > 5_000_000) { await reader.cancel(); throw new Error('Source response too large'); }
        chunks.push(value);
      }
      const text = Buffer.concat(chunks).toString('utf8');
      if (/cf-chl-|<title>Just a moment/i.test(text)) throw new ProviderGatewayError('Source access challenge; no bypass attempted.', 503, 'SOURCE_BLOCKED');
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(key, { expires: Date.now() + 60_000, text });
      return text;
    } catch (error) {
      if (error instanceof ProviderGatewayError) throw error;
      throw new ProviderGatewayError('Source unavailable or request timed out.', 502, 'UPSTREAM_FAILED');
    } finally { clearTimeout(timer); }
  });
  queues.set(origin, operation); pending.set(key, operation);
  try { return await operation; } finally { pending.delete(key); if (queues.get(origin) === operation) queues.delete(origin); }
}

export function checkedId(id: string, pattern: RegExp): string {
  if (!pattern.test(id)) throw new ProviderGatewayError('Invalid source identifier.', 400, 'INVALID_SOURCE_ID');
  return id;
}
