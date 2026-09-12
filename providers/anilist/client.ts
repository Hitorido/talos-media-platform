const ANILIST_GRAPHQL_ENDPOINT = 'https://graphql.anilist.co';

const ANILIST_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

const ANILIST_SEARCH_QUERY = `
query ($search: String, $limit: Int) {
  Page(page: 1, perPage: $limit) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        extraLarge
        large
        medium
      }
      bannerImage
      description
      episodes
      status
      averageScore
      genres
      seasonYear
      format
    }
  }
}
`;

const ANILIST_DETAILS_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title {
      romaji
      english
      native
    }
    coverImage {
      extraLarge
      large
      medium
    }
    bannerImage
    description
    episodes
    status
    averageScore
    genres
    seasonYear
    format
    studios(isMain: true) {
      nodes {
        name
      }
    }
    nextAiringEpisode {
      episode
      airingAt
    }
  }
}
`;

export type AniListAnime = {
  id: number;
  title: {
    romaji?: string;
    english?: string;
    native?: string;
  };
  coverImage?: {
    extraLarge?: string;
    large?: string;
    medium?: string;
  };
  bannerImage?: string;
  description?: string;
  episodes?: number;
  status?: string;
  averageScore?: number;
  genres?: string[];
  seasonYear?: number;
  format?: string;
  studios?: {
    nodes?: { name: string }[];
  };
};

async function anilistFetch<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: ANILIST_HEADERS,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`AniList GraphQL request failed (${response.status})`);
  }

  const json = await response.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0]?.message || 'AniList GraphQL error');
  }

  return json.data as T;
}

export async function searchAniListAnime(query: string, limit = 12): Promise<AniListAnime[]> {
  const data = await anilistFetch<{ Page: { media: AniListAnime[] } }>(ANILIST_SEARCH_QUERY, {
    search: query,
    limit,
  });
  return data.Page?.media ?? [];
}

export async function getAniListAnime(animeId: string | number): Promise<AniListAnime> {
  const numericId = typeof animeId === 'string' ? Number.parseInt(animeId, 10) : animeId;
  const data = await anilistFetch<{ Media: AniListAnime }>(ANILIST_DETAILS_QUERY, {
    id: numericId,
  });
  return data.Media;
}
