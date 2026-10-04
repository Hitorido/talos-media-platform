import { getApiBaseUrl } from '@/lib/apiConfig';
// Backend-backed providers share the Render gateway; route through the wake/retry
// wrapper so a cold start is retried once instead of looking like a dead source.
import { apiRequestWithWake as apiRequest } from '@/services/api/client';
import type { MediaProvider } from '@/providers/types';
import {
  encodeMediaRouteId,
  type NormalizedMedia,
  type NormalizedPage,
  type ProviderMediaType,
} from '@/types/provider';

/** Bridge the existing gateway models into the existing reader; no source-specific UI. */
export function backendComicProvider(id: string, name: string): MediaProvider {
  const imageUrl = (url: string) => {
    if (id === 'mangatown' && url.startsWith('/api/content/mangatown/image?'))
      return getApiBaseUrl() + url;
    if (id !== 'mangapill' || !url) return url;
    const parsed = new URL(url);
    if (parsed.origin !== 'https://cdn.readdetectiveconan.com')
      throw new Error('Unexpected MangaPill image host.');
    return (
      getApiBaseUrl() +
      '/api/content/mangapill/image?path=' +
      encodeURIComponent(parsed.pathname + parsed.search)
    );
  };
  const route = (sourceId: string) => `/api/content/manga/${id}/${encodeURIComponent(sourceId)}`;
  return {
    definition: {
      id,
      name,
      description: `${name} via Talos scraper backend.`,
      mediaTypes: ['manga', 'manhwa', 'manhua'],
      capabilities: ['search', 'details', 'chapters', 'pages'],
      status: 'working',
      statusNote: 'Uses the Talos Render scraper backend.',
      executionMode: 'scraper-backend',
      backendRequired: true,
      health: {},
    },
    async search(query, context) {
      if (context.filter === 'anime' || context.filter === 'novel') return [];
      const supported = this.definition.mediaTypes.filter(
        (type): type is 'manga' | 'manhwa' | 'manhua' =>
          type === 'manga' || type === 'manhwa' || type === 'manhua',
      );
      let type: 'manga' | 'manhwa' | 'manhua' = ['manga', 'manhwa', 'manhua'].includes(
        context.filter,
      )
        ? (context.filter as 'manga' | 'manhwa' | 'manhua')
        : 'manga';
      if (!supported.includes(type)) type = supported[0] ?? 'manga';
      const data = await apiRequest<{
        results: {
          sourceId: string;
          title: string;
          coverUrl?: string;
          status?: string;
          mediaType: ProviderMediaType;
        }[];
      }>(`/api/content/search?providerId=${id}&mediaType=${type}&q=${encodeURIComponent(query)}`, {
        signal: context.signal,
      });
      return data.results.slice(0, context.limit ?? 12).map((item) => ({
        id: encodeMediaRouteId(id, item.sourceId),
        providerId: id,
        sourceId: item.sourceId,
        title: item.title,
        status: item.status,
        coverUrl: imageUrl(item.coverUrl ?? ''),
        type: 'manga' as const,
        comicFormat: (['manhwa', 'manhua'].includes(item.mediaType) ? item.mediaType : 'manga') as
          'manga' | 'manhwa' | 'manhua',
        subtitle: name,
        tags: [name],
      }));
    },
    async getDetails(ref) {
      const data = await apiRequest<Omit<NormalizedMedia, 'ref'> & { genres?: string[] }>(
        route(ref.sourceId),
      );
      return { ...data, ref, genres: data.genres ?? [], coverUrl: imageUrl(data.coverUrl ?? '') };
    },
    async getChapters(ref) {
      const data = await apiRequest<{
        chapters: {
          id: string;
          chapterNumber: number;
          title: string;
          language?: string;
          releaseDate?: string;
        }[];
      }>(`${route(ref.sourceId)}/chapters`);
      return data.chapters.map((c) => ({ ...c, number: c.chapterNumber }));
    },
    async getChapterPages(ref, chapterId) {
      const data = await apiRequest<{ pages: NormalizedPage[] }>(
        `${route(ref.sourceId)}/chapters/${encodeURIComponent(chapterId)}/pages`,
      );
      return data.pages.map((page) => ({ ...page, imageUrl: imageUrl(page.imageUrl) }));
    },
  };
}

export function backendNovelProvider(id: string, name: string): MediaProvider {
  const route = (sourceId: string) => `/api/content/novel/${id}/${encodeURIComponent(sourceId)}`;
  return {
    definition: {
      id,
      name,
      mediaTypes: ['novel'],
      capabilities: ['search', 'details', 'chapters', 'textContent'],
      status: 'limited',
      statusNote:
        id === 'royalroad'
          ? 'Public English fiction adapter; local verification in progress. Removed chapters remain unavailable.'
          : id === 'novelping'
            ? 'Public English text verified locally; deployment and phone verification pending.'
            : id === 'novelarrow'
              ? 'Local text verified; Render upstream HTTP 403. Production reading unavailable.'
              : 'Public text verified through Render; physical reader pending. Locked content is not retrieved.',
      executionMode: 'backend-api',
      backendRequired: true,
      health: {},
    },
    async search(query, context) {
      if (!['all', 'novel'].includes(context.filter)) return [];
      const data = await apiRequest<{
        results: {
          sourceId: string;
          title: string;
          coverUrl?: string;
          status?: string;
          chapterCount?: number;
        }[];
      }>(`/api/content/search?mediaType=novel&providerId=${id}&q=${encodeURIComponent(query)}`, {
        signal: context.signal,
      });
      return data.results.slice(0, context.limit ?? 12).map((x) => ({
        id: encodeMediaRouteId(id, x.sourceId),
        providerId: id,
        sourceId: x.sourceId,
        title: x.title,
        status: x.status,
        coverUrl: x.coverUrl ?? '',
        type: 'novel' as const,
        language: ['novelcodex', 'novelarrow', 'novelping', 'royalroad'].includes(id)
          ? 'en'
          : undefined,
        chapterCount: x.chapterCount,
        subtitle: name,
        tags: [name],
      }));
    },
    async getDetails(ref) {
      const data = await apiRequest<Omit<NormalizedMedia, 'ref'>>(route(ref.sourceId));
      return { ...data, ref, coverUrl: data.coverUrl ?? '', genres: data.genres ?? [] };
    },
    async getChapters(ref) {
      const data = await apiRequest<{
        chapters: { id: string; chapterNumber: number; title: string; language?: string }[];
      }>(`${route(ref.sourceId)}/chapters`);
      return data.chapters.map((c) => ({ ...c, number: c.chapterNumber }));
    },
    async getNovelContent(ref, chapterId) {
      return apiRequest(`${route(ref.sourceId)}/chapters/${encodeURIComponent(chapterId)}/content`);
    },
  };
}
