import { getApiBaseUrl } from '@/lib/apiConfig';
import type { MediaProvider } from '@/providers/types';
import { useBackendConfigStore } from '@/stores/backendConfigStore';
import type {
  MediaRef,
  NormalizedChapter,
  NormalizedMedia,
  NormalizedNovelContent,
} from '@/types/provider';
import { encodeMediaRouteId } from '@/types/provider';
import type { SearchResult } from '@/types/search';

const PROVIDER_ID = 'novel-backend';

type NovelGatewaySearchItem = {
  id: string;
  title: string;
  coverUrl?: string;
  coverImage?: string;
  image?: string;
  author?: string;
  description?: string;
  genres?: string[];
  status?: string;
};

type NovelGatewayNovel = NovelGatewaySearchItem & {
  alternativeTitles?: string[];
  bannerUrl?: string;
  rating?: number;
  language?: string;
};

type NovelGatewayChapter = {
  id: string;
  title?: string;
  number?: number;
  chapterNumber?: number;
  volumeNumber?: number;
  releaseDate?: string;
  publishedAt?: string;
  wordCount?: number;
  language?: string;
};

type NovelGatewayContent = {
  chapterId?: string;
  title?: string;
  paragraphs?: string[];
  content?: string;
  wordCount?: number;
  language?: string;
  previousChapterId?: string;
  nextChapterId?: string;
};

/**
 * Base URL for novel content:
 * 1) User-configured novel gateway from Sources (backendConfigStore.novel)
 * 2) Otherwise this app's Express novel gateway at /api/novels
 */
export function getNovelProviderBaseUrl(): string {
  const configured = useBackendConfigStore.getState().getBackendUrl('novel');
  if (configured?.trim()) {
    return configured.trim().replace(/\/$/, '');
  }
  return `${getApiBaseUrl()}/api/novels`;
}

async function novelGatewayFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const base = getNovelProviderBaseUrl();
  const response = await fetch(`${base}${path}`, {
    signal,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'MangaAnimeNovelReader/1.0',
    },
  });

  if (!response.ok) {
    if (response.status === 503) {
      throw new Error(
        'Novel backend requires configuration. Set a Novel Backend URL in Sources, or set NOVEL_GATEWAY_URL on the Express server.',
      );
    }
    throw new Error(`Novel backend request failed (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as
    | { success?: boolean; data?: T; error?: string }
    | T;

  if (payload && typeof payload === 'object' && 'success' in payload) {
    const enveloped = payload as { success?: boolean; data?: T; error?: string };
    if (enveloped.success === false) {
      throw new Error(enveloped.error ?? 'Novel backend returned an error.');
    }
    if (enveloped.data !== undefined) {
      return enveloped.data;
    }
  }

  return payload as T;
}

function paragraphsFromContent(content: NovelGatewayContent): string[] {
  if (Array.isArray(content.paragraphs) && content.paragraphs.length > 0) {
    return content.paragraphs.filter((p) => typeof p === 'string' && p.trim().length > 0);
  }
  if (typeof content.content === 'string' && content.content.trim()) {
    return content.content
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}

export const novelBackendProvider: MediaProvider = {
  definition: {
    id: PROVIDER_ID,
    name: 'Novel Backend Gateway',
    description:
      'Routes novel search/details/chapters/text through a configured backend (Express /api/novels or a compatible self-hosted novel API).',
    website: undefined,
    mediaTypes: ['novel'],
    capabilities: ['search', 'details', 'chapters', 'textContent', 'downloads'],
    status: 'requires-configuration',
    statusNote:
      'Requires a configured novel backend URL (Sources → Novel Backend URL) or Express NOVEL_GATEWAY_URL pointing at a compatible lncrawl/novel-api-style service. Not scrapers in the Expo app.',
    executionMode: 'backend-api',
    backendRequired: true,
    backendKey: 'novel',
    health: {},
  },

  async search(query, context) {
    const data = await novelGatewayFetch<{ results?: NovelGatewaySearchItem[] }>(
      `/search?q=${encodeURIComponent(query)}`, context.signal,
    );
    return (data.results ?? []).slice(0, context.limit ?? 12).map((item): SearchResult => ({
      id: encodeMediaRouteId(PROVIDER_ID, item.id),
      providerId: PROVIDER_ID,
      sourceId: item.id,
      title: item.title,
      coverUrl:
        item.coverUrl ??
        item.coverImage ??
        item.image ??
        'https://placehold.co/400x600/1f2937/9ca3af?text=Novel',
      type: 'novel',
      subtitle: item.author ? `${item.author} · Novel Backend` : 'Novel Backend',
      tags: ['Novel', 'Backend', ...(item.genres ?? []).slice(0, 3)],
    }));
  },

  async getDetails(ref: MediaRef): Promise<NormalizedMedia> {
    const info = await novelGatewayFetch<NovelGatewayNovel>(`/${encodeURIComponent(ref.sourceId)}`);
    return {
      ref,
      mediaType: 'novel',
      title: info.title,
      alternativeTitles: info.alternativeTitles,
      description: info.description,
      coverUrl:
        info.coverUrl ??
        info.coverImage ??
        info.image ??
        'https://placehold.co/400x600/1f2937/9ca3af?text=Novel',
      bannerUrl: info.bannerUrl,
      genres: info.genres ?? ['Light Novel'],
      status: info.status,
      author: info.author,
      rating: info.rating,
      language: info.language,
    };
  },

  async getChapters(ref: MediaRef): Promise<NormalizedChapter[]> {
    const data = await novelGatewayFetch<{ chapters?: NovelGatewayChapter[] }>(
      `/${encodeURIComponent(ref.sourceId)}/chapters`,
    );
    return (data.chapters ?? []).map((chapter, index) => {
      const number = chapter.number ?? chapter.chapterNumber ?? index + 1;
      return {
        id: chapter.id,
        number,
        title: chapter.title || `Chapter ${number}`,
        releaseDate: chapter.releaseDate ?? chapter.publishedAt,
        wordCount: chapter.wordCount,
        language: chapter.language,
        volumeNumber: chapter.volumeNumber,
      };
    });
  },

  async getNovelContent(ref: MediaRef, chapterId: string): Promise<NormalizedNovelContent> {
    const content = await novelGatewayFetch<NovelGatewayContent>(
      `/${encodeURIComponent(ref.sourceId)}/chapters/${encodeURIComponent(chapterId)}`,
    );
    const paragraphs = paragraphsFromContent(content);
    if (paragraphs.length === 0) {
      throw new Error('Novel backend returned no chapter text.');
    }

    return {
      providerId: PROVIDER_ID,
      novelId: ref.sourceId,
      chapterId: content.chapterId ?? chapterId,
      title: content.title,
      paragraphs,
      wordCount: content.wordCount,
      language: content.language,
      previousChapterId: content.previousChapterId,
      nextChapterId: content.nextChapterId,
      note: 'Fetched via configured novel backend gateway.',
    };
  },
};
