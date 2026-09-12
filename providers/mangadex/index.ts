import {
  getMangaDexChapterPages,
  getMangaDexChapters,
  getMangaDexManga,
  mapMangaDexChapter,
  mapMangaDexToNormalized,
  searchMangaDex,
} from '@/providers/mangadex/client';
import type { MediaProvider } from '@/providers/types';
import type {
  MediaRef,
  NormalizedChapter,
  NormalizedMedia,
  NormalizedPage,
} from '@/types/provider';
import { encodeMediaRouteId } from '@/types/provider';
import type { SearchResult } from '@/types/search';
import { comicFormatLabel } from '@/utils/comicFormat';

const PROVIDER_ID = 'mangadex';

export const mangaDexProvider: MediaProvider = {
  definition: {
    id: PROVIDER_ID,
    name: 'MangaDex',
    website: 'https://mangadex.org',
    description: 'Community manga catalog via the official MangaDex API.',
    mediaTypes: ['manga', 'manhwa', 'manhua'],
    capabilities: ['search', 'details', 'chapters', 'pages', 'images'],
    status: 'working',
    statusNote:
      'Official MangaDex API with full multi-language chapter catalog and dynamic language selection.',
    attribution: 'Data provided by MangaDex.',
    executionMode: 'direct-api',
    health: {},
  },

  async search(query, context) {
    const manga = await searchMangaDex(query, context.limit ?? 12);
    return manga.map((entry): SearchResult => {
      const mapped = mapMangaDexToNormalized(entry);
      return {
        id: encodeMediaRouteId(PROVIDER_ID, entry.id),
        providerId: PROVIDER_ID,
        sourceId: entry.id,
        title: mapped.title,
        coverUrl: mapped.coverUrl,
        type: 'manga',
        comicFormat: mapped.comicFormat,
        subtitle: `MangaDex · ${comicFormatLabel(mapped.comicFormat)}`,
        tags: ['MangaDex', comicFormatLabel(mapped.comicFormat), ...mapped.genres.slice(0, 2)],
      };
    });
  },

  async getDetails(ref: MediaRef): Promise<NormalizedMedia> {
    const manga = await getMangaDexManga(ref.sourceId);
    const mapped = mapMangaDexToNormalized(manga);
    return {
      ref,
      mediaType: mapped.comicFormat,
      title: mapped.title,
      description: mapped.description,
      coverUrl: mapped.coverUrl,
      genres: mapped.genres,
      status: mapped.status,
      language: 'en',
    };
  },

  async getChapters(ref: MediaRef): Promise<NormalizedChapter[]> {
    const chapters = await getMangaDexChapters(ref.sourceId);
    return chapters.map(mapMangaDexChapter);
  },

  async getChapterPages(_ref: MediaRef, chapterId: string): Promise<NormalizedPage[]> {
    const pageUrls = await getMangaDexChapterPages(chapterId);
    return pageUrls.map((imageUrl, index) => ({
      pageNumber: index + 1,
      imageUrl,
      aspectRatio: 0.67,
    }));
  },
};