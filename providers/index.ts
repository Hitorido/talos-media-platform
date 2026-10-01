import { backendAnimeProvider } from '@/providers/backend-content/anime';
import { animeParadiseProvider } from '@/providers/animeparadise';
import { backendComicProvider, backendNovelProvider } from '@/providers/backend-content';
import { aniListAnimeProvider } from '@/providers/anilist';
import { builtinMockProvider } from '@/providers/builtin-mock';
import { jikanAnimeProvider } from '@/providers/jikan';
import { kitsuAnimeProvider } from '@/providers/kitsu';
import { mangaDexProvider } from '@/providers/mangadex';
import { narouProvider } from '@/providers/narou';
import { novelBackendProvider } from '@/providers/novel-backend';
import { providerRegistry } from '@/providers/registry';

let initialized = false;

/** Scraper-backend comic adapters hosted on the Talos Render gateway. */
export const RESTORED_SOURCE_IDS = [
  'weebcentral',
  'mangapill',
  'mangatown',
  'gdscans',
  'demonicscans',
  'kaliscan',
  'mangajinx',
  'asurascans',
  'novelarrow',
  'novelcodex',
  'novelping',
  'royalroad',
  'donghuastream',
  'animeparadise',
];

function registerComic(id: string, name: string, note?: string, mediaTypes?: Array<'manga' | 'manhwa' | 'manhua'>) {
  const provider = backendComicProvider(id, name);
  provider.definition.executionMode = 'scraper-backend';
  provider.definition.backendRequired = true;
  provider.definition.status = 'working';
  if (mediaTypes) provider.definition.mediaTypes = mediaTypes;
  provider.definition.statusNote =
    note ??
    'Uses the Talos Render scraper backend. Upstream sites may temporarily fail (403/challenge).';
  providerRegistry.register(provider);
}

export function initializeProviders(): void {
  if (initialized) return;

  providerRegistry.register(builtinMockProvider);
  providerRegistry.register(mangaDexProvider);

  registerComic('weebcentral', 'WeebCentral');
  registerComic('mangapill', 'MangaPill', 'Manga via Talos Render. Source discontinued manhwa support.');
  registerComic('mangatown', 'MangaTown');
  registerComic('gdscans', 'GdScans');
  registerComic('demonicscans', 'DemonicScans');
  registerComic('kaliscan', 'Kaliscan');
  registerComic('mangajinx', 'MangaJinx');
  registerComic(
    'asurascans',
    'Asura Scans',
    'Manhwa via Talos Render. Search route may be limited if the upstream site changes.',
    ['manhwa'],
  );

  providerRegistry.register(kitsuAnimeProvider);
  providerRegistry.register(aniListAnimeProvider);
  providerRegistry.register(jikanAnimeProvider);
  providerRegistry.register(animeParadiseProvider);
  providerRegistry.register(backendAnimeProvider('donghuastream', 'DonghuaStream'));
  providerRegistry.register(novelBackendProvider);
  providerRegistry.register(narouProvider);
  providerRegistry.register(backendNovelProvider('novelarrow', 'NovelArrow'));
  providerRegistry.register(backendNovelProvider('novelcodex', 'NovelCodex.org'));
  providerRegistry.register(backendNovelProvider('novelping', 'NovelPing'));
  providerRegistry.register(backendNovelProvider('royalroad', 'Royal Road'));

  // Placeholder catalog stubs (empty capabilities) are intentionally not registered —
  // they appeared as disabled "Scraper Backend" cards and blocked usable restored adapters.

  initialized = true;
}

export function getDefaultProviderEnabledMap(): Record<string, boolean> {
  initializeProviders();
  const enabled: Record<string, boolean> = {};
  for (const provider of providerRegistry.list()) {
    const id = provider.definition.id;
    if (/consumet/i.test(id)) {
      enabled[id] = false;
      continue;
    }
    enabled[id] =
      RESTORED_SOURCE_IDS.includes(id) ||
      id === 'builtin-mock' ||
      id === 'mangadex' ||
      id === 'kitsu-anime' ||
      id === 'anilist-anime' ||
      id === 'jikan-anime' ||
      id === 'narou';
  }
  return enabled;
}

export { providerRegistry } from '@/providers/registry';
export type { MediaProvider } from '@/providers/types';
