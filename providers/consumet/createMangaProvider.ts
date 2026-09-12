import {
  consumetMangaInfo,
  consumetMangaRead,
  consumetMangaSearch,
} from '@/providers/consumet/client';
import type { MediaProvider } from '@/providers/types';
import type {
  MediaRef,
  NormalizedChapter,
  NormalizedMedia,
  NormalizedPage,
  ProviderStatus,
} from '@/types/provider';
import { encodeMediaRouteId } from '@/types/provider';
import type { SearchResult } from '@/types/search';
import { comicFormatLabel, inferComicFormatFromGenres, type ComicFormat } from '@/utils/comicFormat';

export type ConsumetMangaProviderConfig = {
  id: string;
  name: string;
  slug: string;
  website?: string;
  description?: string;
  mediaTypes: ComicFormat[];
  status?: ProviderStatus;
  statusNote?: string;
  defaultEnabled?: boolean;
  defaultComicFormat?: ComicFormat;
};

function resolveComicFormat(
  config: ConsumetMangaProviderConfig,
  genres?: string[],
): ComicFormat {
  if (config.mediaTypes.length === 1) {
    return config.mediaTypes[0];
  }
  return inferComicFormatFromGenres(genres, config.defaultComicFormat ?? config.mediaTypes[0]);
}

export function createConsumetMangaProvider(config: ConsumetMangaProviderConfig): MediaProvider {
  const providerId = config.id;

  return {
    definition: {
      id: providerId,
      name: config.name,
      website: config.website,
      description: config.description ?? `Manga via Consumet (${config.slug}).`,
      mediaTypes: config.mediaTypes,
      capabilities: ['search', 'details', 'chapters', 'pages', 'images'],
      status: config.status ?? 'limited',
      statusNote:
        config.statusNote ??
        'Uses the Consumet API. Availability depends on the configured Consumet base URL.',
      attribution: 'Powered by Consumet API.',
      executionMode: 'public-api',
      backendKey: 'consumet',
      health: {},
    },

    async search(query, context) {
      const response = await consumetMangaSearch(config.slug, query, 1);
      return (response.results ?? []).slice(0, context.limit ?? 12).map((item): SearchResult => {
        const comicFormat = resolveComicFormat(config);
        return {
          id: encodeMediaRouteId(providerId, item.id),
          providerId,
          sourceId: item.id,
          title: item.title,
          coverUrl: item.image ?? 'https://placehold.co/400x600/1f2937/9ca3af?text=Manga',
          type: 'manga',
          comicFormat,
          subtitle: `${config.name} · ${comicFormatLabel(comicFormat)}`,
          tags: [config.name, comicFormatLabel(comicFormat)],
        };
      });
    },

    async getDetails(ref: MediaRef): Promise<NormalizedMedia> {
      const info = await consumetMangaInfo(config.slug, ref.sourceId);
      const comicFormat = resolveComicFormat(config, info.genres);
      return {
        ref,
        mediaType: comicFormat,
        title: info.title,
        description: info.description,
        coverUrl: info.image ?? 'https://placehold.co/400x600/1f2937/9ca3af?text=Manga',
        genres: info.genres ?? [comicFormatLabel(comicFormat)],
        status: info.status,
      };
    },

    async getChapters(ref: MediaRef): Promise<NormalizedChapter[]> {
      const info = await consumetMangaInfo(config.slug, ref.sourceId);
      return (info.chapters ?? []).map((chapter, index) => {
        const rawNumber = chapter.chapterNumber ?? chapter.number ?? String(index + 1);
        const number = Number.parseFloat(rawNumber);
        return {
          id: chapter.id,
          number: Number.isFinite(number) ? number : index + 1,
          title: chapter.title || `Chapter ${rawNumber}`,
          language: 'en',
        };
      });
    },

    async getChapterPages(_ref: MediaRef, chapterId: string): Promise<NormalizedPage[]> {
      const pages = await consumetMangaRead(config.slug, chapterId);
      const imageUrls = pages.images ?? pages.pages ?? [];
      if (imageUrls.length === 0) {
        throw new Error('No pages returned for this chapter.');
      }
      return imageUrls.map((imageUrl, index) => ({
        pageNumber: index + 1,
        imageUrl,
        aspectRatio: 0.67,
      }));
    },
  };
}
