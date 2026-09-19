const JIKAN_API = 'https://api.jikan.moe/v4';

const JIKAN_HEADERS: HeadersInit = {
  'User-Agent': 'MangaAnimeNovelReader/1.0',
  Accept: 'application/json',
};

export type JikanAnimeImage = {
  jpg: {
    image_url: string;
    small_image_url?: string;
    large_image_url?: string;
  };
  webp?: {
    image_url: string;
    small_image_url?: string;
    large_image_url?: string;
  };
};

export type JikanAnimeItem = {
  mal_id: number;
  url: string;
  images: JikanAnimeImage;
  title: string;
  title_english?: string;
  title_japanese?: string;
  type?: string;
  episodes?: number;
  status?: string;
  score?: number;
  synopsis?: string;
  genres: { mal_id: number; type: string; name: string }[];
  year?: number;
};

export type JikanEpisodeItem = {
  mal_id: number;
  title: string;
  title_japanese?: string;
  title_romanji?: string;
  aired?: string;
  score?: number;
  filler?: boolean;
  recap?: boolean;
};

type JikanResponse<T> = {
  data: T;
  pagination?: {
    last_visible_page: number;
    has_next_page: boolean;
  };
};

async function jikanFetch<T>(path: string, retries = 2, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${JIKAN_API}${path}`, {
      headers: JIKAN_HEADERS,
      signal: controller.signal,
    });
    if (!response.ok) {
      if (retries > 0 && (response.status === 429 || response.status >= 500)) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return jikanFetch<T>(path, retries - 1);
      }
      throw new Error(`Jikan Anime API request failed (${response.status})`);
    }

    return (await response.json()) as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (retries > 0 && !(error instanceof DOMException && error.name === 'AbortError')) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return jikanFetch<T>(path, retries - 1);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abort);
  }
}

export async function searchJikanAnime(query: string, limit = 12, signal?: AbortSignal): Promise<JikanAnimeItem[]> {
  const payload = await jikanFetch<JikanResponse<JikanAnimeItem[]>>(
    `/anime?q=${encodeURIComponent(query)}&limit=${limit}&sfw=true`, 0, signal,
  );
  return payload.data ?? [];
}

export async function getJikanAnime(animeId: string): Promise<JikanAnimeItem> {
  const payload = await jikanFetch<JikanResponse<JikanAnimeItem>>(`/anime/${animeId}`);
  return payload.data;
}

export async function getJikanAnimeEpisodes(animeId: string): Promise<JikanEpisodeItem[]> {
  try {
    const payload = await jikanFetch<JikanResponse<JikanEpisodeItem[]>>(`/anime/${animeId}/episodes`);
    return payload.data ?? [];
  } catch {
    // If episodes endpoint is rate-limited or unavailable, fallback gracefully
    return [];
  }
}
