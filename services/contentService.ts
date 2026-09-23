import { settleProviderSearches, sameComicTitle, inSearchSlot, searchRequest } from '@/services/providerSearch';
import { initializeProviders, providerRegistry } from '@/providers';
import {
  resolveBuiltinMockAnime,
  resolveBuiltinMockManga,
  resolveBuiltinMockNovel,
} from '@/providers/builtin-mock';
import type { MediaProvider } from '@/providers/types';
import { providerSupports } from '@/providers/types';
import { useProviderHealthStore } from '@/stores/providerHealthStore';
import { useProviderStore } from '@/stores/providerStore';
import type { AnimeDetails } from '@/types/anime';
import type { MangaDetails, MangaPage } from '@/types/manga';
import type { NovelChapter, NovelDetails } from '@/types/novel';
import { resolveAnimeSource, resolveNovelChapter } from '@/services/offlineResolver';
import {
  decodeMediaRouteId,
  encodeMediaRouteId,
  type MediaRef,
  type NormalizedChapter,
  type NormalizedMedia,
  type NormalizedNovelContent,
  type NormalizedPlaybackSource,
} from '@/types/provider';
import type { SearchFilter, SearchResponse, SearchResult } from '@/types/search';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { useBackendConfigStore } from '@/stores/backendConfigStore';
import { providerNovelLanguage, type NovelLanguage } from '@/utils/novelLanguage';
import { isComicFormat } from '@/utils/comicFormat';

const TITLE_MATCH_THRESHOLD = 80;
const searchCache = new Map<string, { expires: number; items: SearchResult[] }>();

export type ResolvedAnimePlaybackResult = {
  source: NormalizedPlaybackSource;
  isOffline: boolean;
  animeTitle: string;
  episodeNumber: number;
  episodeTitle: string;
  durationSeconds?: number;
};

export type ResolvedNovelChapterResult = {
  chapter: NovelChapter;
  content: NormalizedNovelContent;
  isOffline: boolean;
  isDemo: boolean;
};

async function withProviderHealth<T>(providerId: string, operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await operation();
    if (!signal?.aborted) useProviderHealthStore.getState().recordSuccess(providerId, Date.now() - startedAt);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Provider request failed';
    if (!signal?.aborted) useProviderHealthStore.getState().recordFailure(providerId, message, Date.now() - startedAt);
    throw error;
  }
}

function getEnabledProviders() {
  initializeProviders();
  const { enabled } = useProviderStore.getState();
  return providerRegistry.list().filter((provider) => enabled[provider.definition.id] === true);
}

function preferredProviderIdForFilter(filter: SearchFilter): string | undefined {
  const store = useProviderStore.getState();
  if (filter === 'anime') return store.getPreferredProvider('anime');
  if (filter === 'novel') return store.getPreferredProvider('novel');
  if (filter === 'manhwa') return store.getPreferredProvider('manhwa');
  if (filter === 'manhua') return store.getPreferredProvider('manhua');
  if (filter === 'manga') return store.getPreferredProvider('manga');
  return store.getPreferredProvider('manga') ?? store.getPreferredProvider('anime');
}

function orderProvidersForSearch(
  providers: MediaProvider[],
  filter: SearchFilter,
): MediaProvider[] {
  const preferredId = preferredProviderIdForFilter(filter);
  const statusRank = (provider: MediaProvider) => {
    switch (provider.definition.status) {
      case 'working':
        return 0;
      case 'limited':
        return 1;
      case 'requires-configuration':
        return 2;
      default:
        return 3;
    }
  };

  return [...providers].sort((a, b) => {
    if (preferredId) {
      if (a.definition.id === preferredId && b.definition.id !== preferredId) return -1;
      if (b.definition.id === preferredId && a.definition.id !== preferredId) return 1;
    }
    if (filter === 'novel') {
      const rank = (id: string) => ['novelcodex','novelarrow'].includes(id) ? ['novelcodex','novelarrow'].indexOf(id) : 9;
      const diff = rank(a.definition.id) - rank(b.definition.id);
      if (diff) return diff;
    }
    const statusDiff = statusRank(a) - statusRank(b);
    if (statusDiff !== 0) return statusDiff;
    return a.definition.name.localeCompare(b.definition.name);
  });
}

function matchesSearchFilter(result: SearchResult, filter: SearchFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'anime' || filter === 'novel') return result.type === filter;
  if (filter === 'manga') {
    return result.type === 'manga' && (result.comicFormat ?? 'manga') === 'manga';
  }
  if (filter === 'manhwa' || filter === 'manhua') {
    return result.type === 'manga' && result.comicFormat === filter;
  }
  return result.type === filter;
}

function assertProviderEnabled(providerId: string): void {
  const { enabled } = useProviderStore.getState();
  if (enabled[providerId] !== true) {
    throw new Error(
      `Source "${providerId}" is disabled. Enable it in Settings → Sources to use this content.`,
    );
  }
}

function resolveMediaRef(routeOrSourceId: string, fallbackProviderId = 'builtin-mock'): MediaRef {
  const decoded = decodeMediaRouteId(routeOrSourceId);
  if (decoded) return decoded;
  return { providerId: fallbackProviderId, sourceId: routeOrSourceId };
}

function dedupeSearchResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const deduped: SearchResult[] = [];

  for (const result of results) {
    const key = `${result.title.toLowerCase()}::${result.providerId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(result);
  }

  return deduped;
}

function rankSearchResults(results: SearchResult[], filter: SearchFilter): SearchResult[] {
  const preferredId = preferredProviderIdForFilter(filter);
  return [...results].sort((a, b) => {
    if (preferredId) {
      if (a.providerId === preferredId && b.providerId !== preferredId) return -1;
      if (b.providerId === preferredId && a.providerId !== preferredId) return 1;
    }
    if (a.type === 'novel' && b.type === 'novel') {
      const rank = (item: SearchResult) => (item.language ?? providerNovelLanguage(item.providerId)) === 'en' ? 0 : 1;
      const diff = rank(a) - rank(b);
      if (diff) return diff;
    }
    return a.title.localeCompare(b.title);
  });
}

export async function unifiedSearch(query: string, filter: SearchFilter, options: {
  signal?: AbortSignal;
  novelLanguage?: NovelLanguage;
  onProgress?: (results: SearchResult[]) => void;
} = {}): Promise<SearchResponse> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return { query: trimmedQuery, filter, results: [] };

  const novelLanguage = options.novelLanguage ?? 'en';
  const languageMatches = (item: SearchResult) => item.type !== 'novel' || novelLanguage === 'all' || (item.language ?? providerNovelLanguage(item.providerId)) === novelLanguage;
  const providers = orderProvidersForSearch(
    getEnabledProviders().filter((provider) => providerSupports(provider, 'search', filter === 'all' ? undefined : filter) && (novelLanguage === 'all' || !provider.definition.mediaTypes.every(type => type === 'novel') || !providerNovelLanguage(provider.definition.id) || providerNovelLanguage(provider.definition.id) === novelLanguage)),
    filter,
  );

  const started = Date.now();
  let first = false;
  const scope = JSON.stringify([getApiBaseUrl(), useBackendConfigStore.getState().backendUrls]);
  const merged: SearchResult[] = [];
  await settleProviderSearches(providers, (provider) => inSearchSlot(async () => {
    if (options.signal?.aborted) return;
    const key = JSON.stringify([scope, provider.definition.id, trimmedQuery, filter]);
    const cached = searchCache.get(key);
    const providerStarted = Date.now();
    const results = cached && cached.expires > Date.now() ? cached.items :
      await withProviderHealth(provider.definition.id, () =>
        searchRequest(options.signal, signal => provider.search(trimmedQuery, { filter, limit: 12, signal })), options.signal);
    if (!options.signal?.aborted) {
      searchCache.delete(key);
      searchCache.set(key, { expires: cached && cached.expires > Date.now() ? cached.expires : Date.now() + 60_000, items: results.slice(0, 12) });
      while (searchCache.size > 100) searchCache.delete(searchCache.keys().next().value!);
    }
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.debug('[search] provider', provider.definition.id, Date.now() - providerStarted, 'ms');
    if (options.signal?.aborted) return;
    merged.push(...results.slice(0, 12));
    if (!first && merged.some(item => matchesSearchFilter(item, filter) && languageMatches(item) && !hasKnownEmptyChapters(item))) {
      first = true;
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.debug('[search] first results', Date.now() - started, 'ms');
    }
    options.onProgress?.(rankSearchResults(dedupeSearchResults(
      merged.filter((result) => matchesSearchFilter(result, filter) && languageMatches(result) && !hasKnownEmptyChapters(result)),
    ), filter));
  }));
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.debug('[search] total', Date.now() - started, 'ms');
  const filtered = merged.filter((result) => matchesSearchFilter(result, filter) && languageMatches(result) && !hasKnownEmptyChapters(result));

  return {
    query: trimmedQuery,
    filter,
    results: rankSearchResults(dedupeSearchResults(filtered), filter),
  };
}

export function getProviderDisplayName(providerId: string): string {
  initializeProviders();
  return providerRegistry.get(providerId)?.definition.name ?? providerId;
}

export async function searchAlternateComicSources(params: {
  title: string;
  excludeProviderId?: string;
  excludeRouteId?: string;
}): Promise<SearchResult[]> {
  const response = await unifiedSearch(params.title, 'all');
  return response.results.filter((result) => {
    if (result.type !== 'manga' || !sameComicTitle(result.title, params.title)) return false;
    if (params.excludeProviderId && result.providerId === params.excludeProviderId) return false;
    if (params.excludeRouteId && result.id === params.excludeRouteId) return false;
    return true;
  });
}

export async function getMediaDetails(routeId: string): Promise<NormalizedMedia> {
  const ref = resolveMediaRef(routeId);
  assertProviderEnabled(ref.providerId);
  const provider = providerRegistry.get(ref.providerId);
  if (!provider?.getDetails) {
    throw new Error(`Provider "${ref.providerId}" does not support details.`);
  }

  return withProviderHealth(ref.providerId, () => provider.getDetails!(ref));
}

// Only suppress a title after an actual empty chapter-list response, never a transport failure.
const emptyChapterLists = new Map<string, number>();
function chapterAvailabilityKey(routeId: string) { return getApiBaseUrl() + ':' + routeId; }
function hasKnownEmptyChapters(item: SearchResult) {
  if (item.type !== 'manga') return false;
  const key = chapterAvailabilityKey(item.id), until = emptyChapterLists.get(key);
  if (until && until > Date.now()) return true;
  emptyChapterLists.delete(key); return false;
}

export async function getMediaChapters(routeId: string): Promise<NormalizedChapter[]> {
  const ref = resolveMediaRef(routeId);
  assertProviderEnabled(ref.providerId);
  const provider = providerRegistry.get(ref.providerId);
  if (!provider?.getChapters) {
    throw new Error(`Provider "${ref.providerId}" does not support chapters.`);
  }

  const chapters = await withProviderHealth(ref.providerId, () => provider.getChapters!(ref));
  const key = chapterAvailabilityKey(routeId);
  if (chapters.length) emptyChapterLists.delete(key);
  else {
    if (emptyChapterLists.size >= 200) emptyChapterLists.delete(emptyChapterLists.keys().next().value!);
    emptyChapterLists.set(key, Date.now() + 5 * 60_000);
  }
  return chapters;
}

export async function getMediaEpisodes(routeId: string) {
  const ref = resolveMediaRef(routeId);
  assertProviderEnabled(ref.providerId);
  const provider = providerRegistry.get(ref.providerId);
  if (provider?.getEpisodes) {
    return withProviderHealth(ref.providerId, () => provider.getEpisodes!(ref));
  }

  const anime = resolveBuiltinMockAnime(ref);
  if (anime) {
    return anime.episodes.map((ep) => ({
      id: ep.id,
      number: ep.number,
      title: ep.title,
      durationSeconds: ep.durationSeconds,
      thumbnailUrl: ep.thumbnailUrl,
    }));
  }

  throw new Error(`Provider "${ref.providerId}" does not support episodes.`);
}

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function scoreTitleMatch(candidate: string, target: string): number {
  const a = normalizeTitle(candidate);
  const b = normalizeTitle(target);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 85;

  const aTokens = new Set(a.split(' ').filter(Boolean));
  const bTokens = b.split(' ').filter(Boolean);
  if (bTokens.length === 0) return 0;
  const overlap = bTokens.filter((token) => aTokens.has(token)).length;
  return Math.round((overlap / bTokens.length) * 70);
}

function orderStreamingProviders(providers: MediaProvider[], preferredId?: string): MediaProvider[] {
  const statusRank = (provider: MediaProvider) => {
    switch (provider.definition.status) {
      case 'working':
        return 0;
      case 'limited':
        return 1;
      case 'requires-configuration':
        return 2;
      default:
        return 3;
    }
  };

  return [...providers].sort((a, b) => {
    if (preferredId) {
      if (a.definition.id === preferredId && b.definition.id !== preferredId) return -1;
      if (b.definition.id === preferredId && a.definition.id !== preferredId) return 1;
    }
    const statusDiff = statusRank(a) - statusRank(b);
    if (statusDiff !== 0) return statusDiff;
    return a.definition.name.localeCompare(b.definition.name);
  });
}

async function tryPlaybackFromProvider(
  provider: MediaProvider,
  ref: MediaRef,
  episodeId: string,
): Promise<NormalizedPlaybackSource> {
  if (!provider.getPlaybackSource) {
    throw new Error(`Provider "${provider.definition.id}" does not support playback.`);
  }
  return withProviderHealth(provider.definition.id, () =>
    provider.getPlaybackSource!(ref, episodeId),
  );
}

async function resolveCrossProviderPlayback(
  provider: MediaProvider,
  titles: string[],
  episodeNumber: number,
): Promise<NormalizedPlaybackSource> {
  let bestMatch: SearchResult | null = null;
  let bestScore = 0;

  for (const title of titles) {
    const results = await withProviderHealth(provider.definition.id, () =>
      provider.search(title, { filter: 'anime', limit: 8 }),
    );
    for (const result of results) {
      if (result.type !== 'anime') continue;
      const score = scoreTitleMatch(result.title, title);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = result;
      }
    }
  }

  if (!bestMatch || bestScore < TITLE_MATCH_THRESHOLD) {
    throw new Error(
      `${provider.definition.name} has no close title match for playback resolution.`,
    );
  }

  const playbackRef: MediaRef = {
    providerId: bestMatch.providerId,
    sourceId: bestMatch.sourceId,
  };

  if (!provider.getEpisodes || !provider.getPlaybackSource) {
    throw new Error(`${provider.definition.name} cannot resolve episodes for playback.`);
  }

  const episodes = await withProviderHealth(provider.definition.id, () =>
    provider.getEpisodes!(playbackRef),
  );
  const matchedEpisode = episodes.find((episode) => episode.number === episodeNumber);
  if (!matchedEpisode) {
    throw new Error(
      `${provider.definition.name} matched "${bestMatch.title}" but episode ${episodeNumber} was not found.`,
    );
  }

  return tryPlaybackFromProvider(provider, playbackRef, matchedEpisode.id);
}

/**
 * Resolves a normalized playable source for an anime episode.
 * Offline downloads win first; then the media's own streaming provider;
 * then other enabled streaming providers via title/episode matching.
 * Does not silently substitute demo streams for metadata-provider titles.
 */
export async function resolveAnimePlayback(
  routeId: string,
  episodeId: string,
): Promise<ResolvedAnimePlaybackResult> {
  const ref = resolveMediaRef(routeId);
  assertProviderEnabled(ref.providerId);

  const offline = await resolveAnimeSource(routeId, episodeId, '');
  if (offline.isOffline && offline.streamUrl) {
    let animeTitle = 'Anime';
    let episodeNumber = 0;
    let episodeTitle = 'Episode';
    let durationSeconds: number | undefined;

    try {
      const media = await getMediaDetails(routeId);
      const episodes = await getMediaEpisodes(routeId);
      const episode = episodes.find((entry) => entry.id === episodeId);
      animeTitle = media.title;
      episodeNumber = episode?.number ?? 0;
      episodeTitle = episode?.title ?? 'Episode';
      durationSeconds = episode?.durationSeconds;
    } catch {
      // Offline playback can proceed even if metadata fetch fails.
    }

    return {
      source: {
        providerId: ref.providerId,
        sourceId: ref.sourceId,
        mediaId: ref.sourceId,
        episodeId,
        url: offline.streamUrl,
        availability: 'available',
        note: 'Playing from downloaded offline storage.',
      },
      isOffline: true,
      animeTitle,
      episodeNumber,
      episodeTitle,
      durationSeconds,
    };
  }

  const media = await getMediaDetails(routeId);
  const episodes = await getMediaEpisodes(routeId);
  const episode = episodes.find((entry) => entry.id === episodeId);
  if (!episode) {
    throw new Error('Episode not found for this anime.');
  }

  const titles = [media.title, ...(media.alternativeTitles ?? [])].filter(Boolean);
  const preferredStreamingId = useProviderStore.getState().getPreferredProvider('anime');
  const streamingProviders = orderStreamingProviders(
    getEnabledProviders().filter(
      (provider) =>
        providerSupports(provider, 'streaming', 'anime') && Boolean(provider.getPlaybackSource),
    ),
    preferredStreamingId,
  );

  const errors: string[] = [];

  const homeProvider = providerRegistry.get(ref.providerId);
  if (homeProvider?.getPlaybackSource) {
    try {
      const source = await tryPlaybackFromProvider(homeProvider, ref, episodeId);
      const withOffline = await resolveAnimeSource(routeId, episodeId, source.url);
      return {
        source: {
          ...source,
          url: withOffline.streamUrl || source.url,
        },
        isOffline: withOffline.isOffline,
        animeTitle: media.title,
        episodeNumber: episode.number,
        episodeTitle: episode.title,
        durationSeconds: episode.durationSeconds,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Playback failed';
      errors.push(`${homeProvider.definition.name}: ${message}`);
    }
  }

  for (const provider of streamingProviders) {
    if (provider.definition.id === ref.providerId) continue;

    try {
      const source = await resolveCrossProviderPlayback(provider, titles, episode.number);
      // Demo providers may only return demo streams for their own catalog matches.
      // Cross-provider matches that are demo are allowed only when title matched above threshold.
      const withOffline = await resolveAnimeSource(routeId, episodeId, source.url);
      return {
        source: {
          ...source,
          url: withOffline.streamUrl || source.url,
        },
        isOffline: withOffline.isOffline,
        animeTitle: media.title,
        episodeNumber: episode.number,
        episodeTitle: episode.title,
        durationSeconds: episode.durationSeconds,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Playback failed';
      errors.push(`${provider.definition.name}: ${message}`);
    }
  }

  const detail =
    errors.length > 0
      ? errors.join(' | ')
      : 'No enabled streaming providers implement getPlaybackSource.';

  throw new Error(
    `Unable to resolve playback for this episode. Metadata providers (AniList/Jikan/Kitsu) do not supply streams. ${detail}`,
  );
}

export async function getMangaChapterPages(
  routeId: string,
  chapterId: string,
): Promise<MangaPage[]> {
  const ref = resolveMediaRef(routeId);
  assertProviderEnabled(ref.providerId);
  const provider = providerRegistry.get(ref.providerId);

  if (provider?.getChapterPages) {
    const pages = await withProviderHealth(ref.providerId, () =>
      provider.getChapterPages!(ref, chapterId),
    );
    return pages.map((page) => ({
      pageNumber: page.pageNumber,
      imageUrl: page.imageUrl,
      aspectRatio: page.aspectRatio ?? 0.67,
      chapterId,
    }));
  }

  const manga = resolveBuiltinMockManga(ref);
  const chapter = manga?.chapters.find((entry) => entry.id === chapterId);
  if (chapter) {
    return chapter.pages;
  }

  throw new Error('Unable to resolve chapter pages.');
}

export async function getNovelChapterContent(routeId: string, chapterId: string) {
  const ref = resolveMediaRef(routeId);
  assertProviderEnabled(ref.providerId);
  const provider = providerRegistry.get(ref.providerId);

  if (provider?.getNovelContent) {
    return withProviderHealth(ref.providerId, () => provider.getNovelContent!(ref, chapterId));
  }

  // Legacy builtin fallback only when the media itself is built-in demo content.
  if (ref.providerId === 'builtin-mock') {
    const novel = resolveBuiltinMockNovel(ref);
    const chapter = novel?.chapters.find((entry) => entry.id === chapterId);
    if (chapter) {
      const index = novel!.chapters.findIndex((entry) => entry.id === chapterId);
      return {
        providerId: ref.providerId,
        novelId: novel!.id,
        chapterId: chapter.id,
        title: chapter.title,
        paragraphs: chapter.paragraphs,
        wordCount: chapter.wordCount,
        previousChapterId: index > 0 ? novel!.chapters[index - 1]?.id : undefined,
        nextChapterId:
          index >= 0 && index < novel!.chapters.length - 1
            ? novel!.chapters[index + 1]?.id
            : undefined,
        isDemo: true,
        note: 'Built-in demo novel text for development.',
      } satisfies NormalizedNovelContent;
    }
  }

  throw new Error(
    `Provider "${ref.providerId}" does not support novel chapter content. Enable a configured novel source or use the Built-in Demo Catalog.`,
  );
}

/**
 * Resolves novel chapter text for the reader: offline download first, then provider content.
 * Does not silently substitute demo novels for failed real providers.
 */
export async function resolveNovelChapterContent(
  routeId: string,
  chapterId: string,
  chapterMeta?: Pick<NovelChapter, 'id' | 'number' | 'title' | 'releaseDate' | 'wordCount'>,
): Promise<ResolvedNovelChapterResult> {
  const placeholder: NovelChapter = {
    id: chapterId,
    number: chapterMeta?.number ?? 0,
    title: chapterMeta?.title ?? 'Chapter',
    releaseDate: chapterMeta?.releaseDate ?? '',
    wordCount: chapterMeta?.wordCount ?? 0,
    paragraphs: [],
  };

  const offline = await resolveNovelChapter(routeId, chapterId, placeholder);
  if (offline.isOffline && offline.chapter.paragraphs.length > 0) {
    return {
      chapter: offline.chapter,
      content: {
        providerId: resolveMediaRef(routeId).providerId,
        novelId: routeId,
        chapterId: offline.chapter.id,
        title: offline.chapter.title,
        paragraphs: offline.chapter.paragraphs,
        wordCount: offline.chapter.wordCount,
        note: 'Loaded from downloaded offline storage.',
      },
      isOffline: true,
      isDemo: false,
    };
  }

  const content = await getNovelChapterContent(routeId, chapterId);
  if (!content.paragraphs || content.paragraphs.length === 0) {
    throw new Error('Novel chapter returned no text content.');
  }

  const chapter: NovelChapter = {
    id: content.chapterId,
    number: chapterMeta?.number ?? 0,
    title: content.title ?? chapterMeta?.title ?? 'Chapter',
    releaseDate: chapterMeta?.releaseDate ?? '',
    wordCount: content.wordCount ?? chapterMeta?.wordCount ?? 0,
    paragraphs: content.paragraphs,
  };

  return {
    chapter,
    content,
    isOffline: false,
    isDemo: Boolean(content.isDemo),
  };
}

export async function searchAlternateNovelSources(params: {
  title: string;
  excludeProviderId?: string;
  excludeRouteId?: string;
}): Promise<SearchResult[]> {
  const response = await unifiedSearch(params.title, 'novel');
  return response.results.filter((result) => {
    if (result.type !== 'novel') return false;
    if (params.excludeProviderId && result.providerId === params.excludeProviderId) return false;
    if (params.excludeRouteId && result.id === params.excludeRouteId) return false;
    return true;
  });
}

export function getBuiltinMangaDetails(routeId: string): MangaDetails | undefined {
  const ref = resolveMediaRef(routeId);
  if (ref.providerId !== 'builtin-mock') return undefined;
  return resolveBuiltinMockManga(ref);
}

export function getBuiltinNovelDetails(routeId: string): NovelDetails | undefined {
  const ref = resolveMediaRef(routeId);
  if (ref.providerId !== 'builtin-mock') return undefined;
  return resolveBuiltinMockNovel(ref);
}

export function getBuiltinAnimeDetails(routeId: string): AnimeDetails | undefined {
  const ref = resolveMediaRef(routeId);
  if (ref.providerId !== 'builtin-mock') return undefined;
  return resolveBuiltinMockAnime(ref);
}

export function toMediaRouteId(ref: MediaRef): string {
  return encodeMediaRouteId(ref.providerId, ref.sourceId);
}

export function resolveComicFormatFromMedia(media: NormalizedMedia) {
  if (isComicFormat(media.mediaType)) return media.mediaType;
  const genres = media.genres.map((genre) => genre.toLowerCase());
  if (genres.some((genre) => genre.includes('manhwa'))) return 'manhwa';
  if (genres.some((genre) => genre.includes('manhua'))) return 'manhua';
  return 'manga';
}

export { resolveMediaRef };
