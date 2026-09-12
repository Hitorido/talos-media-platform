import { searchCatalog } from '@/services/mock/searchCatalog';
import type { MediaProvider } from '@/providers/types';
import type {
  MediaRef,
  NormalizedChapter,
  NormalizedEpisode,
  NormalizedMedia,
  NormalizedNovelContent,
  NormalizedPlaybackSource,
} from '@/types/provider';
import { encodeMediaRouteId } from '@/types/provider';
import type { SearchFilter, SearchResult } from '@/types/search';
import { getAnimeById } from '@/services/mock/animeData';
import { getMangaById } from '@/services/mock/mangaData';
import { getNovelById } from '@/services/mock/novelData';

const PROVIDER_ID = 'builtin-mock';

function matchesQuery(entry: (typeof searchCatalog)[number], query: string, filter: SearchFilter) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;
  if (filter !== 'all' && entry.type !== filter) return false;

  return (
    entry.title.toLowerCase().includes(normalizedQuery) ||
    entry.subtitle.toLowerCase().includes(normalizedQuery) ||
    entry.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
  );
}

function getMangaMediaType(genres: string[]) {
  if (genres.includes('Manhwa')) return 'manhwa' as const;
  if (genres.includes('Manhua')) return 'manhua' as const;
  return 'manga' as const;
}

export const builtinMockProvider: MediaProvider = {
  definition: {
    id: PROVIDER_ID,
    name: 'Built-in Demo Catalog',
    description: 'Local demo catalog used for development and offline previews.',
    website: undefined,
    mediaTypes: ['anime', 'manga', 'manhwa', 'manhua', 'novel'],
    capabilities: [
      'search',
      'details',
      'chapters',
      'episodes',
      'pages',
      'textContent',
      'streaming',
      'downloads',
    ],
    status: 'working',
    statusNote: 'Always available for local development.',
    executionMode: 'local',
    health: {},
  },

  async search(query, context) {
    const results = searchCatalog
      .filter((entry) => matchesQuery(entry, query, context.filter))
      .slice(0, context.limit ?? 20)
      .map((entry): SearchResult => ({
        id: encodeMediaRouteId(PROVIDER_ID, entry.sourceId),
        providerId: PROVIDER_ID,
        sourceId: entry.sourceId,
        title: entry.title,
        coverUrl: entry.coverUrl,
        type: entry.type,
        subtitle: entry.subtitle,
        tags: entry.tags,
      }));

    return results;
  },

  async getDetails(ref: MediaRef): Promise<NormalizedMedia> {
    const anime = getAnimeById(ref.sourceId);
    if (anime) {
      return {
        ref,
        mediaType: 'anime',
        title: anime.title,
        description: anime.description,
        coverUrl: anime.coverUrl,
        bannerUrl: anime.bannerUrl,
        genres: anime.genres,
        status: anime.status,
        rating: anime.rating,
      };
    }

    const manga = getMangaById(ref.sourceId);
    if (manga) {
      return {
        ref,
        mediaType: getMangaMediaType(manga.genres),
        title: manga.title,
        description: manga.description,
        coverUrl: manga.coverUrl,
        bannerUrl: manga.bannerUrl,
        genres: manga.genres,
        status: manga.status,
        author: manga.author,
        artist: manga.artist,
        rating: manga.rating,
      };
    }

    const novel = getNovelById(ref.sourceId);
    if (novel) {
      return {
        ref,
        mediaType: 'novel',
        title: novel.title,
        description: novel.description,
        coverUrl: novel.coverUrl,
        bannerUrl: novel.bannerUrl,
        genres: novel.genres,
        status: novel.status,
        author: novel.author,
        rating: novel.rating,
      };
    }

    throw new Error('Media not found in built-in catalog.');
  },

  async getChapters(ref: MediaRef): Promise<NormalizedChapter[]> {
    const manga = getMangaById(ref.sourceId);
    if (manga) {
      return manga.chapters.map((chapter) => ({
        id: chapter.id,
        number: chapter.number,
        title: chapter.title,
        releaseDate: chapter.releaseDate,
      }));
    }

    const novel = getNovelById(ref.sourceId);
    if (novel) {
      return novel.chapters.map((chapter) => ({
        id: chapter.id,
        number: chapter.number,
        title: chapter.title,
        releaseDate: chapter.releaseDate,
        wordCount: chapter.wordCount,
      }));
    }

    throw new Error('Chapters not available for this built-in media item.');
  },

  async getEpisodes(ref: MediaRef): Promise<NormalizedEpisode[]> {
    const anime = getAnimeById(ref.sourceId);
    if (!anime) {
      throw new Error('Episodes not available for this built-in media item.');
    }

    return anime.episodes.map((episode) => ({
      id: episode.id,
      number: episode.number,
      title: episode.title,
      durationSeconds: episode.durationSeconds,
      thumbnailUrl: episode.thumbnailUrl,
    }));
  },

  async getPlaybackSource(ref: MediaRef, episodeId: string): Promise<NormalizedPlaybackSource> {
    const anime = getAnimeById(ref.sourceId);
    const episode = anime?.episodes.find((entry) => entry.id === episodeId);
    if (!anime || !episode?.streamUrl) {
      throw new Error('Demo playback source not found for this episode.');
    }

    return {
      providerId: PROVIDER_ID,
      sourceId: ref.sourceId,
      mediaId: ref.sourceId,
      episodeId: episode.id,
      url: episode.streamUrl,
      quality: 'demo',
      isDirectStream: !episode.streamUrl.includes('.m3u8'),
      isDemo: true,
      availability: 'demo',
      note: 'Legal sample video for development only — not licensed anime content.',
    };
  },

  async getNovelContent(ref: MediaRef, chapterId: string): Promise<NormalizedNovelContent> {
    const novel = getNovelById(ref.sourceId);
    const chapter = novel?.chapters.find((entry) => entry.id === chapterId);
    if (!novel || !chapter) {
      throw new Error('Demo novel chapter not found.');
    }

    const index = novel.chapters.findIndex((entry) => entry.id === chapterId);
    return {
      providerId: PROVIDER_ID,
      novelId: novel.id,
      chapterId: chapter.id,
      title: chapter.title,
      paragraphs: chapter.paragraphs,
      wordCount: chapter.wordCount,
      previousChapterId: index > 0 ? novel.chapters[index - 1]?.id : undefined,
      nextChapterId:
        index >= 0 && index < novel.chapters.length - 1 ? novel.chapters[index + 1]?.id : undefined,
      isDemo: true,
      note: 'Built-in demo novel text for development.',
    };
  },
};

export function resolveBuiltinMockManga(ref: MediaRef) {
  return getMangaById(ref.sourceId);
}

export function resolveBuiltinMockNovel(ref: MediaRef) {
  return getNovelById(ref.sourceId);
}

export function resolveBuiltinMockAnime(ref: MediaRef) {
  return getAnimeById(ref.sourceId);
}
