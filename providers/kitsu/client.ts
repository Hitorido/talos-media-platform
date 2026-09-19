const KITSU_API = 'https://kitsu.io/api/edge';

const KITSU_HEADERS: HeadersInit = {
  Accept: 'application/vnd.api+json',
  'Content-Type': 'application/vnd.api+json',
  'User-Agent': 'MangaAnimeNovelReader/1.0',
};

export type KitsuAnimeAttributes = {
  canonicalTitle: string;
  titles?: {
    en?: string;
    en_jp?: string;
    ja_jp?: string;
  };
  synopsis?: string;
  description?: string;
  averageRating?: string;
  userCount?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  posterImage?: {
    tiny?: string;
    small?: string;
    medium?: string;
    large?: string;
    original?: string;
  };
  coverImage?: {
    tiny?: string;
    small?: string;
    large?: string;
    original?: string;
  };
  episodeCount?: number;
  episodeLength?: number;
  youtubeVideoId?: string;
  showType?: string;
};

export type KitsuAnimeItem = {
  id: string;
  type: string;
  attributes: KitsuAnimeAttributes;
};

type KitsuResponse<T> = {
  data: T;
};

async function kitsuFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${KITSU_API}${path}`, { headers: KITSU_HEADERS, signal });
  if (!response.ok) {
    throw new Error(`Kitsu Anime API request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function searchKitsuAnime(query: string, limit = 12, signal?: AbortSignal): Promise<KitsuAnimeItem[]> {
  const payload = await kitsuFetch<KitsuResponse<KitsuAnimeItem[]>>(
    `/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=${limit}`,
    signal,
  );
  return payload.data ?? [];
}

export async function getKitsuAnime(animeId: string): Promise<KitsuAnimeItem> {
  const payload = await kitsuFetch<KitsuResponse<KitsuAnimeItem>>(`/anime/${animeId}`);
  return payload.data;
}

export async function getKitsuEpisodes(animeId: string): Promise<{ id: string; number: number; title: string; synopsis?: string }[]> {
  try {
    const payload = await kitsuFetch<KitsuResponse<{ id: string; attributes: { number: number; canonicalTitle?: string; synopsis?: string } }[]>>(
      `/anime/${animeId}/episodes?page[limit]=50`,
    );
    return (payload.data ?? []).map((ep) => ({
      id: ep.id,
      number: ep.attributes.number,
      title: ep.attributes.canonicalTitle || `Episode ${ep.attributes.number}`,
      synopsis: ep.attributes.synopsis,
    }));
  } catch {
    return [];
  }
}
