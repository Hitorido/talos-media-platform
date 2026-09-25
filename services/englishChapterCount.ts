import { initializeProviders, providerRegistry } from '@/providers';
import { useProviderStore } from '@/stores/providerStore';
import { decodeMediaRouteId } from '@/types/provider';
import { getApiBaseUrl } from '@/lib/apiConfig';

const cache = new Map<string, { count: number; expires: number }>();
const pending = new Map<string, { operation: Promise<number>; consumers: Set<AbortSignal | undefined> }>();
let active = 0;
const queue: (() => void)[] = [];
async function slot<T>(run: () => Promise<T>): Promise<T> {
  await new Promise<void>(resolve => {
    const start = () => { active++; resolve(); };
    if (active < 2) start(); else queue.push(start);
  });
  try { return await run(); } finally { active--; queue.shift()?.(); }
}
// These adapters expose English catalogs. Unknown-language adapters are not assumed English.
const englishCatalogs = new Set(['mangapill','weebcentral','gdscans','demonicscans','mangatown','kaliscan','mangajinx','novelcodex','novelarrow','novelping']);
export async function getEnglishChapterCount(routeId: string, signal?: AbortSignal): Promise<number> {
  const ref = decodeMediaRouteId(routeId);
  if (!ref || !useProviderStore.getState().enabled[ref.providerId]) throw new Error('Source disabled');
  const key = getApiBaseUrl() + '|' + routeId;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.count;
  const shared = pending.get(key);
  if (shared) { shared.consumers.add(signal); return shared.operation; }
  const consumers = new Set([signal]);
  const operation = slot(async () => {
    if ([...consumers].every(consumer => consumer?.aborted)) throw new DOMException('Card no longer visible', 'AbortError');
    if (!useProviderStore.getState().enabled[ref.providerId]) throw new Error('Source disabled');
    let count: number;
    if (ref.providerId === 'mangadex') {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch('https://api.mangadex.org/manga/' + encodeURIComponent(ref.sourceId) + '/aggregate?translatedLanguage[]=en', { signal: controller.signal });
        if (!response.ok) throw new Error('Chapter count HTTP ' + response.status);
        const data = await response.json() as { volumes: Record<string, { chapters: Record<string, unknown> }> };
        if (!data.volumes || typeof data.volumes !== 'object') throw new Error('Missing chapter aggregate');
        // Aggregate chapter entries collapse alternate uploads/scanlation groups.
        count = Object.values(data.volumes).reduce((sum, volume) => sum + Object.keys(volume.chapters ?? {}).length, 0);
      } finally { clearTimeout(timer); }
    } else {
      initializeProviders();
      const provider = providerRegistry.get(ref.providerId);
      if (!provider?.getChapters) throw new Error('Chapter count unavailable');
      const chapters = await provider.getChapters(ref);
      const english = chapters.filter(chapter => chapter.language ? /^en(?:g|[-_].*)?$/i.test(chapter.language) : englishCatalogs.has(ref.providerId));
      if (chapters.length && !english.length && !englishCatalogs.has(ref.providerId)) throw new Error('English count unavailable');
      count = new Set(english.map(chapter => chapter.id)).size;
    }
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    cache.set(key, { count, expires: Date.now() + 600000 });
    return count;
  });
  pending.set(key, { operation, consumers });
  void operation.then(() => pending.delete(key), () => pending.delete(key));
  return operation;
}
