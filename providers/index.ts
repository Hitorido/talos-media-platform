import { backendAnimeProvider } from '@/providers/backend-content/anime';
import { animeParadiseProvider } from '@/providers/animeparadise';
import { backendComicProvider, backendNovelProvider } from '@/providers/backend-content';
import { aniListAnimeProvider } from '@/providers/anilist';
import { builtinMockProvider } from '@/providers/builtin-mock';
import { stubProviders } from '@/providers/catalog/stubProviders';
import { jikanAnimeProvider } from '@/providers/jikan';
import { kitsuAnimeProvider } from '@/providers/kitsu';
import { mangaDexProvider } from '@/providers/mangadex';
import { narouProvider } from '@/providers/narou';
import { novelBackendProvider } from '@/providers/novel-backend';
import { providerRegistry } from '@/providers/registry';

let initialized = false;

export function initializeProviders(): void {
  if (initialized) return;

  providerRegistry.register(builtinMockProvider);
  providerRegistry.register(mangaDexProvider);
  providerRegistry.register(backendComicProvider('weebcentral', 'WeebCentral'));
  const mangaPill = backendComicProvider('mangapill', 'MangaPill');
  mangaPill.definition.mediaTypes = ['manga'];
  providerRegistry.register(mangaPill);
  const mangaTown = backendComicProvider('mangatown', 'MangaTown');
  mangaTown.definition.mediaTypes = ['manga'];
  providerRegistry.register(mangaTown);
  for (const [id, name] of [['kaliscan', 'Kaliscan'], ['mangajinx', 'MangaJinx'], ['gdscans', 'GdScans'], ['demonicscans', 'DemonicScans']]) {
    const provider = backendComicProvider(id, name);
    provider.definition.mediaTypes = ['manga'];
    provider.definition.statusNote = id === 'gdscans' ? 'Public images verified through Render; phone validation pending.' : id === 'demonicscans' ? 'Local images verified; Render upstream HTTP 403. Production reading unavailable.' : 'Local images work; Render upstream HTTP 403. Some source chapters have dead images.';
    providerRegistry.register(provider);
  }
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



  for (const stub of stubProviders) {
    const id = stub.definition.id;
    const note = stub.definition.statusNote || '';
    if (/consumet/i.test(`${id} ${note}`)) continue;
    const slug = id.replace(/^stub-/, '');
    // Prefer the restored scraper-backend adapters over catalog stubs.
    if (RESTORED_SOURCE_IDS.includes(slug) || RESTORED_SOURCE_IDS.includes(id)) continue;
    providerRegistry.register(stub);
  }

  initialized = true;
}

export const RESTORED_SOURCE_IDS = ['weebcentral','mangapill','mangatown','gdscans','demonicscans','kaliscan','mangajinx','novelarrow','novelcodex','novelping','royalroad','donghuastream','animeparadise'];

export function getDefaultProviderEnabledMap(): Record<string, boolean> {
  initializeProviders();
  const enabled: Record<string, boolean> = {};
  for (const provider of providerRegistry.list()) {
    const id = provider.definition.id;
    enabled[id] =
      RESTORED_SOURCE_IDS.includes(id) || id === 'builtin-mock' ||
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
