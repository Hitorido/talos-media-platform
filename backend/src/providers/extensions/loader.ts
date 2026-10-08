import type { ContentProviderAdapter } from '../types.js';

type Extension = {
  id: string;
  version: string;
  kind: 'video' | 'comic' | 'novel';
  runtime: 'talos-adapter-v1';
};
const methods = {
  video: ['search', 'getDetails', 'getEpisodes', 'getPlaybackSource'],
  comic: ['search', 'getDetails', 'getChapters', 'getPages'],
  novel: ['search', 'getDetails', 'getChapters', 'getNovelContent'],
} as const;
/** Validate a versioned manifest against reviewed modules bundled with this deployment. */
export function loadReviewedExtensions(
  manifest: unknown,
  modules: Record<string, ContentProviderAdapter>,
): ContentProviderAdapter[] {
  if (!manifest || typeof manifest !== 'object') throw new Error('Invalid extension manifest');
  const catalog = manifest as { schemaVersion: number; extensions: Extension[] };
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.extensions))
    throw new Error('Unsupported extension manifest');
  const seen = new Set<string>();
  return catalog.extensions.map((entry) => {
    if (
      !entry ||
      !/^[a-z0-9-]+$/.test(entry.id) ||
      seen.has(entry.id) ||
      !/^\d+\.\d+\.\d+$/.test(entry.version) ||
      entry.runtime !== 'talos-adapter-v1' ||
      !Object.hasOwn(methods, entry.kind)
    )
      throw new Error('Invalid extension entry');
    seen.add(entry.id);
    const adapter = Object.hasOwn(modules, entry.id) ? modules[entry.id] : undefined;
    if (!adapter || adapter.definition.id !== entry.id)
      throw new Error(`Unreviewed extension: ${entry.id}`);
    for (const method of methods[entry.kind])
      if (typeof adapter[method] !== 'function')
        throw new Error(`${entry.id} is missing ${method}`);
    const expected =
      entry.kind === 'video'
        ? ['anime', 'movie', 'tv']
        : entry.kind === 'novel'
          ? ['novel']
          : ['manga', 'manhwa', 'manhua'];
    if (!adapter.definition.mediaTypes.some((type) => expected.includes(type)))
      throw new Error(`Media type mismatch: ${entry.id}`);
    return adapter;
  });
}
