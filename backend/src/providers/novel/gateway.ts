import { ENV } from '../../config/env.js';

/**
 * Novel gateway adapter — proxies to a configured external novel content service.
 * Scraping stays outside Expo; this server only forwards legitimate configured backends.
 */

export type NovelGatewaySearchResult = {
  id: string;
  title: string;
  coverUrl?: string;
  author?: string;
  description?: string;
  genres?: string[];
  status?: string;
};

export type NovelGatewayNovel = NovelGatewaySearchResult & {
  alternativeTitles?: string[];
  bannerUrl?: string;
  rating?: number;
  language?: string;
};

export type NovelGatewayChapter = {
  id: string;
  title: string;
  number: number;
  volumeNumber?: number;
  releaseDate?: string;
  wordCount?: number;
  language?: string;
};

export type NovelGatewayContent = {
  chapterId: string;
  title?: string;
  paragraphs: string[];
  wordCount?: number;
  language?: string;
  previousChapterId?: string;
  nextChapterId?: string;
};

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data: unknown }).data;
    return data as T;
  }
  return payload as T;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeSearchResults(payload: unknown): NovelGatewaySearchResult[] {
  const data = unwrapData<unknown>(payload);
  const list =
    (data && typeof data === 'object' && 'results' in data
      ? (data as { results: unknown }).results
      : Array.isArray(data)
        ? data
        : []) ?? [];

  if (!Array.isArray(list)) return [];

  return list.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const id = asString(row.id) ?? asString(row.sourceId);
    const title = asString(row.title) ?? asString(row.name);
    if (!id || !title) return [];
    const result: NovelGatewaySearchResult = {
      id,
      title,
    };
    const coverUrl =
      asString(row.coverUrl) ?? asString(row.coverImage) ?? asString(row.image) ?? undefined;
    if (coverUrl) result.coverUrl = coverUrl;
    const author = asString(row.author);
    if (author) result.author = author;
    const description = asString(row.description);
    if (description) result.description = description;
    if (Array.isArray(row.genres)) {
      result.genres = row.genres.filter((g): g is string => typeof g === 'string');
    }
    const status = asString(row.status);
    if (status) result.status = status;
    return [result];
  });
}

function normalizeNovel(payload: unknown, fallbackId: string): NovelGatewayNovel {
  const data = unwrapData<Record<string, unknown>>(payload);
  const id = asString(data.id) ?? fallbackId;
  const title = asString(data.title) ?? asString(data.name) ?? 'Untitled Novel';
  return {
    id,
    title,
    coverUrl: asString(data.coverUrl) ?? asString(data.coverImage) ?? asString(data.image),
    author: asString(data.author),
    description: asString(data.description),
    genres: Array.isArray(data.genres)
      ? data.genres.filter((g): g is string => typeof g === 'string')
      : undefined,
    status: asString(data.status),
    alternativeTitles: Array.isArray(data.alternativeTitles)
      ? data.alternativeTitles.filter((g): g is string => typeof g === 'string')
      : undefined,
    bannerUrl: asString(data.bannerUrl),
    rating: asNumber(data.rating),
    language: asString(data.language),
  };
}

function normalizeChapters(payload: unknown): NovelGatewayChapter[] {
  const data = unwrapData<unknown>(payload);
  const list =
    (data && typeof data === 'object' && 'chapters' in data
      ? (data as { chapters: unknown }).chapters
      : Array.isArray(data)
        ? data
        : []) ?? [];

  if (!Array.isArray(list)) return [];

  return list.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const id = asString(row.id);
    if (!id) return [];
    const number = asNumber(row.number) ?? asNumber(row.chapterNumber) ?? index + 1;
    const chapter: NovelGatewayChapter = {
      id,
      title: asString(row.title) ?? `Chapter ${number}`,
      number,
    };
    const volumeNumber = asNumber(row.volumeNumber);
    if (volumeNumber !== undefined) chapter.volumeNumber = volumeNumber;
    const releaseDate = asString(row.releaseDate) ?? asString(row.publishedAt);
    if (releaseDate) chapter.releaseDate = releaseDate;
    const wordCount = asNumber(row.wordCount);
    if (wordCount !== undefined) chapter.wordCount = wordCount;
    const language = asString(row.language);
    if (language) chapter.language = language;
    return [chapter];
  });
}

function normalizeContent(payload: unknown, chapterId: string): NovelGatewayContent {
  const data = unwrapData<Record<string, unknown>>(payload);
  let paragraphs: string[] = [];
  if (Array.isArray(data.paragraphs)) {
    paragraphs = data.paragraphs.filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
  } else if (typeof data.content === 'string' && data.content.trim()) {
    paragraphs = data.content
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return {
    chapterId: asString(data.chapterId) ?? chapterId,
    title: asString(data.title),
    paragraphs,
    wordCount: asNumber(data.wordCount),
    language: asString(data.language),
    previousChapterId: asString(data.previousChapterId),
    nextChapterId: asString(data.nextChapterId),
  };
}

export function getNovelGatewayUrl(): string | undefined {
  const value = ENV.NOVEL_GATEWAY_URL.trim();
  return value ? value.replace(/\/$/, '') : undefined;
}

export function isNovelGatewayConfigured(): boolean {
  return Boolean(getNovelGatewayUrl());
}

async function gatewayFetch(path: string): Promise<unknown> {
  const base = getNovelGatewayUrl();
  if (!base) {
    const error = new Error(
      'Novel gateway is not configured. Set NOVEL_GATEWAY_URL to a compatible novel content service.',
    );
    (error as Error & { status?: number }).status = 503;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ENV.PROVIDER_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${base}${path}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'MangaAnimeNovelReader-Backend/1.0',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`Upstream novel gateway failed (HTTP ${response.status}).`);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error('Upstream novel gateway request timed out.');
      (timeoutError as Error & { status?: number }).status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function novelGatewaySearch(query: string): Promise<NovelGatewaySearchResult[]> {
  const payload = await gatewayFetch(`/search?q=${encodeURIComponent(query)}`);
  return normalizeSearchResults(payload);
}

export async function novelGatewayGetNovel(novelId: string): Promise<NovelGatewayNovel> {
  const payload = await gatewayFetch(`/${encodeURIComponent(novelId)}`);
  return normalizeNovel(payload, novelId);
}

export async function novelGatewayGetChapters(novelId: string): Promise<NovelGatewayChapter[]> {
  const payload = await gatewayFetch(`/${encodeURIComponent(novelId)}/chapters`);
  return normalizeChapters(payload);
}

export async function novelGatewayGetChapterContent(
  novelId: string,
  chapterId: string,
): Promise<NovelGatewayContent> {
  const payload = await gatewayFetch(
    `/${encodeURIComponent(novelId)}/chapters/${encodeURIComponent(chapterId)}`,
  );
  return normalizeContent(payload, chapterId);
}
