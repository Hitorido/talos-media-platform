import { getConsumetBaseUrl } from '@/stores/backendConfigStore';

const CONSUMET_HEADERS: HeadersInit = {
  'User-Agent': 'MangaAnimeNovelReader/1.0',
  Accept: 'application/json',
};

export type ConsumetSearchResult = {
  id: string;
  title: string;
  image?: string;
  releaseDate?: string;
};

export type ConsumetSearchResponse = {
  currentPage?: number;
  hasNextPage?: boolean;
  results: ConsumetSearchResult[];
};

export type ConsumetChapter = {
  id: string;
  title: string;
  chapterNumber?: string;
  number?: string;
};

export type ConsumetMangaInfo = {
  id: string;
  title: string;
  image?: string;
  description?: string;
  genres?: string[];
  status?: string;
  chapters?: ConsumetChapter[];
};

export type ConsumetChapterPages = {
  id?: string;
  title?: string;
  images?: string[];
  pages?: string[];
};

export async function consumetFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${getConsumetBaseUrl()}${path}`, { headers: CONSUMET_HEADERS, signal });
  if (!response.ok) {
    if (response.status === 451) {
      throw new Error(
        'Consumet public API is unavailable (HTTP 451). Configure a self-hosted Consumet URL in Sources backend settings, or use MangaDex.',
      );
    }
    if (response.status === 404) {
      throw new Error('Consumet provider endpoint not found (HTTP 404).');
    }
    throw new Error(`Consumet request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function consumetMangaSearch(
  providerSlug: string,
  query: string,
  page = 1,
  signal?: AbortSignal,
): Promise<ConsumetSearchResponse> {
  return consumetFetch<ConsumetSearchResponse>(
    `/manga/${providerSlug}/${encodeURIComponent(query)}?page=${page}`, signal,
  );
}

export async function consumetMangaInfo(
  providerSlug: string,
  mangaId: string,
): Promise<ConsumetMangaInfo> {
  return consumetFetch<ConsumetMangaInfo>(
    `/manga/${providerSlug}/info?id=${encodeURIComponent(mangaId)}`,
  );
}

export async function consumetMangaRead(
  providerSlug: string,
  chapterId: string,
): Promise<ConsumetChapterPages> {
  return consumetFetch<ConsumetChapterPages>(
    `/manga/${providerSlug}/read?chapterId=${encodeURIComponent(chapterId)}`,
  );
}

export type ConsumetAnimeEpisode = {
  id: string;
  title?: string;
  number?: number;
  image?: string;
};

export type ConsumetAnimeInfo = {
  id: string;
  title: string;
  image?: string;
  description?: string;
  genres?: string[];
  status?: string;
  episodes?: ConsumetAnimeEpisode[];
};

export type ConsumetStreamSource = {
  url: string;
  quality?: string;
  isM3U8?: boolean;
};

export type ConsumetWatchResponse = {
  sources?: ConsumetStreamSource[];
  download?: string;
  subtitles?: { url: string; lang?: string; language?: string }[];
  headers?: Record<string, string>;
};

export async function consumetAnimeSearch(
  providerSlug: string,
  query: string,
  page = 1,
  signal?: AbortSignal,
): Promise<ConsumetSearchResponse> {
  return consumetFetch<ConsumetSearchResponse>(
    `/anime/${providerSlug}/${encodeURIComponent(query)}?page=${page}`, signal,
  );
}

export async function consumetAnimeInfo(
  providerSlug: string,
  animeId: string,
): Promise<ConsumetAnimeInfo> {
  try {
    return await consumetFetch<ConsumetAnimeInfo>(
      `/anime/${providerSlug}/info/${encodeURIComponent(animeId)}`,
    );
  } catch {
    return consumetFetch<ConsumetAnimeInfo>(
      `/anime/${providerSlug}/info?id=${encodeURIComponent(animeId)}`,
    );
  }
}

export async function consumetAnimeWatch(
  providerSlug: string,
  episodeId: string,
): Promise<ConsumetWatchResponse> {
  return consumetFetch<ConsumetWatchResponse>(
    `/anime/${providerSlug}/watch/${encodeURIComponent(episodeId)}`,
  );
}
