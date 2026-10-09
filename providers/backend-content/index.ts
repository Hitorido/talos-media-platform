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
    if (id === 'manhuaplus' && url) {
      const image = new URL(url);
      if (['https://cdn.manhuaplus.cc', 'https://cdn.manhuaplus.org'].includes(image.origin))
        return (
          getApiBaseUrl() +
          '/api/content/proxy/manhuaplus/image?path=' +
          encodeURIComponent(image.pathname)
        );
    }
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

const DIRECT_NOVEL_ORIGINS: Record<string, string> = {
  novelarrow: 'https://novelarrow.com',
  novelping: 'https://novelping.com',
};

async function directNovelFetchJson<T>(
  origin: string,
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`${origin}${path}`, {
    signal,
    headers: {
      Accept: 'application/json, text/plain, */*',
    },
  });
  if (!res.ok) {
    throw new Error(`Direct source HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function backendNovelProvider(id: string, name: string): MediaProvider {
  const route = (sourceId: string) => `/api/content/novel/${id}/${encodeURIComponent(sourceId)}`;
  const directOrigin = DIRECT_NOVEL_ORIGINS[id];

  return {
    definition: {
      id,
      name,
      mediaTypes: ['novel'],
      capabilities: ['search', 'details', 'chapters', 'textContent'],
      status: 'working',
      statusNote: directOrigin
        ? 'Supports direct-client requests and backend gateway fallback.'
        : id === 'wanderinginn'
          ? 'Author-hosted English web serial; local gateway verified. Deployment and phone verification pending.'
          : id === 'royalroad'
            ? 'Public English fiction adapter; local verification in progress. Removed chapters remain unavailable.'
            : 'Public text verified through Render; physical reader pending. Locked content is not retrieved.',
      executionMode: directOrigin ? 'direct-api' : 'backend-api',
      backendRequired: !directOrigin,
      health: {},
    },
    async search(query, context) {
      if (!['all', 'novel'].includes(context.filter)) return [];

      const mapResults = (
        items: {
          sourceId: string;
          title: string;
          coverUrl?: string;
          status?: string;
          chapterCount?: number;
        }[],
      ) =>
        items.slice(0, context.limit ?? 12).map((x) => ({
          id: encodeMediaRouteId(id, x.sourceId),
          providerId: id,
          sourceId: x.sourceId,
          title: x.title,
          status: x.status,
          coverUrl: x.coverUrl ?? '',
          type: 'novel' as const,
          language: ['novelcodex', 'novelarrow', 'novelping', 'royalroad', 'wanderinginn'].includes(
            id,
          )
            ? 'en'
            : undefined,
          chapterCount: x.chapterCount,
          subtitle: name,
          tags: [name],
        }));

      // If this provider supports direct client access, try direct first, then backend
      if (directOrigin) {
        try {
          const directData = await directNovelFetchJson<{
            items?: { novel_id: string; novel_name: string; totalChapter?: number }[];
          }>(directOrigin, `/api-web/search?keyword=${encodeURIComponent(query)}`, context.signal);
          if (Array.isArray(directData.items) && directData.items.length > 0) {
            return mapResults(
              directData.items.map((item) => ({
                sourceId: item.novel_id,
                title: item.novel_name,
                coverUrl: `https://images.${id}.com/novel/${item.novel_id}.jpg`,
                chapterCount: item.totalChapter,
              })),
            );
          }
        } catch {
          // Fall through to backend gateway if direct fetch fails
        }
      }

      try {
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
        return mapResults(data.results);
      } catch (err) {
        // If backend fails (e.g. Render 403) and direct origin exists, retry direct
        if (directOrigin) {
          const directData = await directNovelFetchJson<{
            items?: { novel_id: string; novel_name: string; totalChapter?: number }[];
          }>(directOrigin, `/api-web/search?keyword=${encodeURIComponent(query)}`, context.signal);
          return mapResults(
            (directData.items || []).map((item) => ({
              sourceId: item.novel_id,
              title: item.novel_name,
              coverUrl: `https://images.${id}.com/novel/${item.novel_id}.jpg`,
              chapterCount: item.totalChapter,
            })),
          );
        }
        throw err;
      }
    },
    async getDetails(ref) {
      if (directOrigin) {
        try {
          const directData = await directNovelFetchJson<{
            item?: {
              novelInfo?: {
                novel_id: string;
                novel_name: string;
                novel_author?: string;
                novel_status?: number;
                novel_desc?: string;
                novel_genres?: string[];
              };
            };
          }>(directOrigin, `/api-web/novels/${encodeURIComponent(ref.sourceId)}`);
          const info = directData.item?.novelInfo;
          if (info && info.novel_name) {
            const cleanDesc = (info.novel_desc || '')
              .replace(/<\/(?:p|div|h[1-6]|li)>/gi, '\n\n')
              .replace(/<br\s*[\/]?>/gi, '\n')
              .replace(/<[^>]+>/g, '')
              .trim();
            return {
              ref,
              mediaType: 'novel',
              title: info.novel_name,
              description: cleanDesc,
              coverUrl: `https://images.${id}.com/novel/${info.novel_id}.jpg`,
              genres: Array.isArray(info.novel_genres) ? info.novel_genres : [],
              status: info.novel_status === 0 ? 'ongoing' : 'completed',
              author: info.novel_author,
              language: 'en',
            };
          }
        } catch {
          // Fall through to backend gateway
        }
      }

      try {
        const data = await apiRequest<Omit<NormalizedMedia, 'ref'>>(route(ref.sourceId));
        return { ...data, ref, coverUrl: data.coverUrl ?? '', genres: data.genres ?? [] };
      } catch (err) {
        if (directOrigin) {
          const directData = await directNovelFetchJson<{
            item?: {
              novelInfo?: {
                novel_id: string;
                novel_name: string;
                novel_author?: string;
                novel_status?: number;
                novel_desc?: string;
                novel_genres?: string[];
              };
            };
          }>(directOrigin, `/api-web/novels/${encodeURIComponent(ref.sourceId)}`);
          const info = directData.item?.novelInfo;
          if (info && info.novel_name) {
            const cleanDesc = (info.novel_desc || '')
              .replace(/<\/(?:p|div|h[1-6]|li)>/gi, '\n\n')
              .replace(/<br\s*[\/]?>/gi, '\n')
              .replace(/<[^>]+>/g, '')
              .trim();
            return {
              ref,
              mediaType: 'novel',
              title: info.novel_name,
              description: cleanDesc,
              coverUrl: `https://images.${id}.com/novel/${info.novel_id}.jpg`,
              genres: Array.isArray(info.novel_genres) ? info.novel_genres : [],
              status: info.novel_status === 0 ? 'ongoing' : 'completed',
              author: info.novel_author,
              language: 'en',
            };
          }
        }
        throw err;
      }
    },
    async getChapters(ref) {
      if (directOrigin) {
        try {
          const directData = await directNovelFetchJson<{
            items?: {
              chapter_id: string;
              chapter_name: string;
              premium_content?: boolean;
              platinum_content?: boolean;
              coin_price?: number;
            }[];
          }>(directOrigin, `/api-web/novels/${encodeURIComponent(ref.sourceId)}/chapters?sort=asc`);
          if (Array.isArray(directData.items)) {
            return directData.items
              .filter((c) => !c.premium_content && !c.platinum_content && !c.coin_price)
              .map((c, i) => ({
                id: c.chapter_id,
                number: Number(
                  c.chapter_name.match(/(?:chapter\s*)?(\d+(?:\.\d+)?)/i)?.[1] ?? i + 1,
                ),
                title: c.chapter_name.trim(),
                language: 'en',
              }));
          }
        } catch {
          // Fall through to backend gateway
        }
      }

      try {
        const data = await apiRequest<{
          chapters: { id: string; chapterNumber: number; title: string; language?: string }[];
        }>(`${route(ref.sourceId)}/chapters`);
        return data.chapters.map((c) => ({ ...c, number: c.chapterNumber }));
      } catch (err) {
        if (directOrigin) {
          const directData = await directNovelFetchJson<{
            items?: {
              chapter_id: string;
              chapter_name: string;
              premium_content?: boolean;
              platinum_content?: boolean;
              coin_price?: number;
            }[];
          }>(directOrigin, `/api-web/novels/${encodeURIComponent(ref.sourceId)}/chapters?sort=asc`);
          if (Array.isArray(directData.items)) {
            return directData.items
              .filter((c) => !c.premium_content && !c.platinum_content && !c.coin_price)
              .map((c, i) => ({
                id: c.chapter_id,
                number: Number(
                  c.chapter_name.match(/(?:chapter\s*)?(\d+(?:\.\d+)?)/i)?.[1] ?? i + 1,
                ),
                title: c.chapter_name.trim(),
                language: 'en',
              }));
          }
        }
        throw err;
      }
    },
    async getNovelContent(ref, chapterId) {
      if (directOrigin) {
        try {
          const directData = await directNovelFetchJson<{
            item?: {
              show_button_unlock?: boolean;
              chapterInfo?: {
                chapter_name: string;
                chapter_content?: string;
                premium_content?: boolean;
                platinum_content?: boolean;
                coin_price?: number;
                prevChapter?: { chapter_id: string } | null;
                nextChapter?: { chapter_id: string } | null;
              };
            };
          }>(
            directOrigin,
            `/api-web/novels/${encodeURIComponent(ref.sourceId)}/chapters/${encodeURIComponent(chapterId)}`,
          );
          const item = directData.item;
          const c = item?.chapterInfo;
          if (
            c &&
            !item?.show_button_unlock &&
            !c.premium_content &&
            !c.platinum_content &&
            !c.coin_price
          ) {
            const raw = c.chapter_content || '';
            const paragraphs = raw
              .replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi, '')
              .replace(/<\/(?:p|div|li)>/gi, '\n\n')
              .replace(/<br\s*[\/]?>/gi, '\n')
              .replace(/<[^>]+>/g, '')
              .split(/\n+/)
              .map((s) => s.trim())
              .filter(Boolean);
            if (paragraphs.length > 0) {
              return {
                providerId: id,
                novelId: ref.sourceId,
                chapterId,
                title: c.chapter_name.trim(),
                paragraphs,
                language: 'en',
                previousChapterId: c.prevChapter?.chapter_id,
                nextChapterId: c.nextChapter?.chapter_id,
              };
            }
          }
        } catch {
          // Fall through to backend gateway
        }
      }

      try {
        return await apiRequest(
          `${route(ref.sourceId)}/chapters/${encodeURIComponent(chapterId)}/content`,
        );
      } catch (err) {
        if (directOrigin) {
          const directData = await directNovelFetchJson<{
            item?: {
              show_button_unlock?: boolean;
              chapterInfo?: {
                chapter_name: string;
                chapter_content?: string;
                premium_content?: boolean;
                platinum_content?: boolean;
                coin_price?: number;
                prevChapter?: { chapter_id: string } | null;
                nextChapter?: { chapter_id: string } | null;
              };
            };
          }>(
            directOrigin,
            `/api-web/novels/${encodeURIComponent(ref.sourceId)}/chapters/${encodeURIComponent(chapterId)}`,
          );
          const item = directData.item;
          const c = item?.chapterInfo;
          if (
            c &&
            !item?.show_button_unlock &&
            !c.premium_content &&
            !c.platinum_content &&
            !c.coin_price
          ) {
            const raw = c.chapter_content || '';
            const paragraphs = raw
              .replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi, '')
              .replace(/<\/(?:p|div|li)>/gi, '\n\n')
              .replace(/<br\s*[\/]?>/gi, '\n')
              .replace(/<[^>]+>/g, '')
              .split(/\n+/)
              .map((s) => s.trim())
              .filter(Boolean);
            if (paragraphs.length > 0) {
              return {
                providerId: id,
                novelId: ref.sourceId,
                chapterId,
                title: c.chapter_name.trim(),
                paragraphs,
                language: 'en',
                previousChapterId: c.prevChapter?.chapter_id,
                nextChapterId: c.nextChapter?.chapter_id,
              };
            }
          }
        }
        throw err;
      }
    },
  };
}
