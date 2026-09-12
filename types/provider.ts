export type ProviderMediaType =
  | 'anime'
  | 'manga'
  | 'manhwa'
  | 'manhua'
  | 'novel'
  | 'movie'
  | 'tv';

export type ProviderCapability =
  | 'search'
  | 'browse'
  | 'details'
  | 'episodes'
  | 'chapters'
  | 'pages'
  | 'textContent'
  | 'streaming'
  | 'subtitles'
  | 'downloads'
  | 'images'
  | 'recommendations';

export type ProviderStatus =
  | 'candidate'
  | 'working'
  | 'limited'
  | 'unavailable'
  | 'broken'
  | 'unsupported'
  | 'requires-configuration'
  | 'requires-backend'
  | 'disabled';

/** How a provider fetches content. The reader does not depend on this. */
export type ProviderExecutionMode =
  | 'direct-api'
  | 'public-api'
  | 'backend-api'
  | 'scraper-backend'
  | 'browser'
  | 'user-configured'
  | 'local';

export type MediaRef = {
  providerId: string;
  sourceId: string;
};

export type NormalizedMedia = {
  ref: MediaRef;
  mediaType: ProviderMediaType;
  title: string;
  alternativeTitles?: string[];
  description?: string;
  coverUrl: string;
  bannerUrl?: string;
  genres: string[];
  status?: string;
  author?: string;
  artist?: string;
  rating?: number;
  language?: string;
};

export type NormalizedChapter = {
  id: string;
  number: number;
  title: string;
  releaseDate?: string;
  pageCount?: number;
  wordCount?: number;
  language?: string;
  scanlationGroup?: string;
  volumeNumber?: number;
};

export type NormalizedEpisode = {
  id: string;
  number: number;
  title: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
  airDate?: string;
};

export type NormalizedPlaybackSource = {
  providerId: string;
  sourceId: string;
  mediaId?: string;
  episodeId?: string;
  url: string;
  quality?: string;
  audioLanguage?: string;
  subtitles?: { language: string; url: string }[];
  isDirectStream?: boolean;
  /** True when the stream is a legal development/demo sample, not licensed anime video. */
  isDemo?: boolean;
  availability?: 'available' | 'unavailable' | 'demo';
  note?: string;
};

export type NormalizedNovelContent = {
  providerId?: string;
  novelId?: string;
  chapterId: string;
  title?: string;
  paragraphs: string[];
  wordCount?: number;
  language?: string;
  previousChapterId?: string;
  nextChapterId?: string;
  /** True when content is from the built-in demo catalog. */
  isDemo?: boolean;
  note?: string;
};

export type NormalizedPage = {
  pageNumber: number;
  imageUrl: string;
  aspectRatio?: number;
};

export type ProviderHealth = {
  lastSuccessAt?: number;
  lastFailureAt?: number;
  lastResponseMs?: number;
  lastError?: string;
};

export type ProviderDefinition = {
  id: string;
  name: string;
  website?: string;
  description?: string;
  mediaTypes: ProviderMediaType[];
  capabilities: ProviderCapability[];
  status: ProviderStatus;
  statusNote?: string;
  attribution?: string;
  /** How this provider reaches its data source. */
  executionMode: ProviderExecutionMode;
  /** When true, a backend URL must be configured before the provider can work. */
  backendRequired?: boolean;
  /** Backend key used in backendConfigStore (e.g. "consumet", "scraper"). */
  backendKey?: 'consumet' | 'scraper' | 'novel';
  health: ProviderHealth;
};

const ROUTE_SEPARATOR = '__';

export function encodeMediaRouteId(providerId: string, sourceId: string): string {
  return `${providerId}${ROUTE_SEPARATOR}${sourceId}`;
}

export function decodeMediaRouteId(routeId: string): MediaRef | null {
  const separatorIndex = routeId.indexOf(ROUTE_SEPARATOR);
  if (separatorIndex <= 0) return null;

  return {
    providerId: routeId.slice(0, separatorIndex),
    sourceId: routeId.slice(separatorIndex + ROUTE_SEPARATOR.length),
  };
}

export function isProviderRouteId(routeId: string): boolean {
  return decodeMediaRouteId(routeId) !== null;
}
