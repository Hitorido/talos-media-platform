import { animeParadiseProvider } from '@/providers/animeparadise';
import { backendComicProvider, backendNovelProvider } from '@/providers/backend-content';
import { aniListAnimeProvider } from '@/providers/anilist';
import { builtinMockProvider } from '@/providers/builtin-mock';
import { stubProviders } from '@/providers/catalog/stubProviders';
import { createConsumetAnimeProvider } from '@/providers/consumet/createAnimeProvider';
import { createConsumetMangaProvider } from '@/providers/consumet/createMangaProvider';
import { jikanAnimeProvider } from '@/providers/jikan';
import { kitsuAnimeProvider } from '@/providers/kitsu';
import { mangaDexProvider } from '@/providers/mangadex';
import { narouProvider } from '@/providers/narou';
import { novelBackendProvider } from '@/providers/novel-backend';
import { providerRegistry } from '@/providers/registry';

let initialized = false;

const CONSUMET_UNAVAILABLE_NOTE =
  'Public api.consumet.org currently returns HTTP 451. Enable only with a working self-hosted Consumet URL.';

const consumetAnimeProviders = [
  createConsumetAnimeProvider({
    id: 'consumet-gogoanime',
    name: 'Gogoanime (Consumet)',
    slug: 'gogoanime',
    website: 'https://github.com/consumet/api.consumet.org',
    status: 'unavailable',
    statusNote: CONSUMET_UNAVAILABLE_NOTE,
  }),
  createConsumetAnimeProvider({
    id: 'consumet-zoro',
    name: 'Zoro / HiAnime (Consumet)',
    slug: 'zoro',
    website: 'https://github.com/consumet/api.consumet.org',
    status: 'unavailable',
    statusNote: CONSUMET_UNAVAILABLE_NOTE,
  }),
];

const consumetMangaProviders = [
  createConsumetMangaProvider({
    id: 'consumet-mangapark',
    name: 'MangaPark',
    slug: 'mangapark',
    website: 'https://mangapark.net',
    mediaTypes: ['manga', 'manhwa', 'manhua'],
    status: 'unavailable',
    statusNote: CONSUMET_UNAVAILABLE_NOTE,
  }),
  createConsumetMangaProvider({
    id: 'consumet-mangakakalot',
    name: 'MangaKakalot',
    slug: 'mangakakalot',
    website: 'https://mangakakalot.com',
    mediaTypes: ['manga', 'manhwa', 'manhua'],
    status: 'unavailable',
    statusNote: `${CONSUMET_UNAVAILABLE_NOTE} Covers many aggregator-style mirrors when Consumet is reachable.`,
  }),
  createConsumetMangaProvider({
    id: 'consumet-mangasee',
    name: 'MangaSee',
    slug: 'mangasee123',
    website: 'https://mangasee123.com',
    mediaTypes: ['manhwa', 'manhua', 'manga'],
    status: 'unavailable',
    statusNote: CONSUMET_UNAVAILABLE_NOTE,
  }),
  createConsumetMangaProvider({
    id: 'consumet-mangahere',
    name: 'MangaHere',
    slug: 'mangahere',
    website: 'https://www.mangahere.cc',
    mediaTypes: ['manga', 'manhwa', 'manhua'],
    status: 'unavailable',
    statusNote: CONSUMET_UNAVAILABLE_NOTE,
  }),
  createConsumetMangaProvider({
    id: 'consumet-mangapill',
    name: 'MangaPill',
    slug: 'mangapill',
    website: 'https://mangapill.com',
    mediaTypes: ['manga', 'manhwa'],
    status: 'unavailable',
    statusNote: CONSUMET_UNAVAILABLE_NOTE,
  }),
  createConsumetMangaProvider({
    id: 'consumet-weebcentral',
    name: 'WeebCentral',
    slug: 'weebcentral',
    website: 'https://weebcentral.com',
    mediaTypes: ['manga', 'manhwa', 'manhua'],
    status: 'unavailable',
    statusNote: CONSUMET_UNAVAILABLE_NOTE,
  }),
  createConsumetMangaProvider({
    id: 'consumet-comick',
    name: 'ComicK',
    slug: 'comick',
    website: 'https://comick.art',
    mediaTypes: ['manga', 'manhwa', 'manhua'],
    status: 'unavailable',
    statusNote: CONSUMET_UNAVAILABLE_NOTE,
  }),
  createConsumetMangaProvider({
    id: 'consumet-asurascans',
    name: 'Asura Scans',
    slug: 'asurascans',
    website: 'https://asuracomic.net',
    mediaTypes: ['manhwa', 'manhua'],
    status: 'unavailable',
    statusNote: CONSUMET_UNAVAILABLE_NOTE,
  }),
  createConsumetMangaProvider({
    id: 'consumet-mangareader',
    name: 'MangaReader',
    slug: 'managreader',
    mediaTypes: ['manga'],
    status: 'unavailable',
    statusNote: CONSUMET_UNAVAILABLE_NOTE,
  }),
];

export function initializeProviders(): void {
  if (initialized) return;

  providerRegistry.register(builtinMockProvider);
  providerRegistry.register(mangaDexProvider);
  providerRegistry.register(backendComicProvider('weebcentral', 'WeebCentral'));
  const mangaPill = backendComicProvider('mangapill', 'MangaPill');
  mangaPill.definition.mediaTypes = ['manga'];
  providerRegistry.register(mangaPill);
  for (const [id, name] of [['kaliscan', 'Kaliscan'], ['mangajinx', 'MangaJinx'], ['gdscans', 'GdScans'], ['demonicscans', 'DemonicScans']]) {
    const provider = backendComicProvider(id, name);
    provider.definition.mediaTypes = ['manga'];
    provider.definition.statusNote = id === 'gdscans' ? 'Public images verified through Render; phone validation pending.' : id === 'demonicscans' ? 'Local public images verified; Render and phone validation pending.' : 'Local images work; Render upstream HTTP 403. Some source chapters have dead images.';
    providerRegistry.register(provider);
  }
  providerRegistry.register(kitsuAnimeProvider);
  providerRegistry.register(aniListAnimeProvider);
  providerRegistry.register(jikanAnimeProvider);
  providerRegistry.register(animeParadiseProvider);
  providerRegistry.register(novelBackendProvider);
  providerRegistry.register(narouProvider);
  providerRegistry.register(backendNovelProvider('novelarrow', 'NovelArrow'));
  providerRegistry.register(backendNovelProvider('novelcodex', 'NovelCodex.org'));

  for (const provider of consumetMangaProviders) {
    providerRegistry.register(provider);
  }

  for (const provider of consumetAnimeProviders) {
    providerRegistry.register(provider);
  }

  for (const stub of stubProviders) {
    providerRegistry.register(stub);
  }

  initialized = true;
}

export function getDefaultProviderEnabledMap(): Record<string, boolean> {
  initializeProviders();
  const enabled: Record<string, boolean> = {};
  for (const provider of providerRegistry.list()) {
    const id = provider.definition.id;
    enabled[id] =
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
