import { apiRequest } from '@/services/api/client';
import type { MediaProvider } from '@/providers/types';
import type { MediaRef, NormalizedChapter, NormalizedMedia, NormalizedNovelContent } from '@/types/provider';
import { encodeMediaRouteId } from '@/types/provider';
import type { SearchResult } from '@/types/search';

const PROVIDER_ID = 'narou';

type NarouSearchResult = {
  id: string;
  title: string;
  coverUrl?: string;
  author?: string;
  chapterCount?: number;
  description?: string;
  genres?: string[];
  status?: string;
};

type NarouChapter = {
  id: string;
  title: string;
  chapterNumber: number;
  language?: string;
};

type NarouContent = {
  chapterId: string;
  title?: string;
  paragraphs: string[];
  wordCount?: number;
  language?: string;
};

async function narouRequest<T>(path: string, signal?: AbortSignal): Promise<T> {
  return apiRequest<T>(`/api/content${path}`, {signal});
}

export const narouProvider: MediaProvider = {
  definition: {
    id: PROVIDER_ID,
    name: 'Shosetsuka ni Narou',
    website: 'https://syosetu.com',
    description: 'Official Japanese web-novel API and public chapter pages.',
    mediaTypes: ['novel'],
    capabilities: ['search', 'details', 'chapters', 'textContent'],
    status: 'working',
    statusNote: 'Search, chapter lists, and real Japanese chapter text use the Talos backend adapter.',
    attribution: 'Source: Shosetsuka ni Narou. Service and content terms apply.',
    executionMode: 'backend-api',
    backendRequired: true,
    health: {},
  },

  async search(query, context) {
    const data = await narouRequest<{ results: NarouSearchResult[] }>(
      `/search?mediaType=novel&providerId=${PROVIDER_ID}&q=${encodeURIComponent(query)}`, context.signal,
    );
    return data.results.slice(0, context.limit ?? 12).map((item): SearchResult => ({
      id: encodeMediaRouteId(PROVIDER_ID, item.id),
      providerId: PROVIDER_ID,
      sourceId: item.id,
      title: item.title,
      coverUrl: item.coverUrl ?? 'https://placehold.co/400x600/1f2937/9ca3af?text=Novel',
      type: 'novel',
      language: 'ja',
      chapterCount: item.chapterCount,
      subtitle: item.author ? `${item.author} · Narou` : 'Narou',
      tags: ['Novel', 'Japanese', ...(item.genres ?? []).slice(0, 3)],
    }));
  },

  async getDetails(ref: MediaRef): Promise<NormalizedMedia> {
    const data = await narouRequest<NormalizedMedia>(
      `/novel/${PROVIDER_ID}/${encodeURIComponent(ref.sourceId)}`,
    );
    return { ...data, ref, mediaType: 'novel' };
  },

  async getChapters(ref: MediaRef): Promise<NormalizedChapter[]> {
    const data = await narouRequest<{ chapters: NarouChapter[] }>(
      `/novel/${PROVIDER_ID}/${encodeURIComponent(ref.sourceId)}/chapters`,
    );
    return data.chapters.map((chapter) => ({
      id: chapter.id,
      number: chapter.chapterNumber,
      title: chapter.title,
      language: chapter.language,
    }));
  },

  async getNovelContent(ref: MediaRef, chapterId: string): Promise<NormalizedNovelContent> {
    const data = await narouRequest<NormalizedNovelContent>(
      `/novel/${PROVIDER_ID}/${encodeURIComponent(ref.sourceId)}/chapters/${encodeURIComponent(chapterId)}/content`,
    );
    if (!data.paragraphs?.length) throw new Error('Narou chapter returned no text content.');
    return data;
  },
};
