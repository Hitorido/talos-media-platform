/**
 * Backend content-provider types for the unified gateway.
 * Kept as backend equivalents of the Expo normalized models (not a second frontend registry).
 */

export type BackendMediaType =
  | 'manga'
  | 'manhwa'
  | 'manhua'
  | 'anime'
  | 'novel'
  | 'movie'
  | 'tv';

export type BackendProviderCapability =
  | 'search'
  | 'browse'
  | 'details'
  | 'chapters'
  | 'pages'
  | 'episodes'
  | 'textContent'
  | 'streaming'
  | 'subtitles'
  | 'images'
  | 'downloads'
  | 'recommendations';

export type BackendProviderStatus =
  | 'working'
  | 'available'
  | 'limited'
  | 'requires-configuration'
  | 'unavailable'
  | 'broken'
  | 'disabled'
  | 'demo'
  | 'planned';

export type BackendProviderHealth = {
  lastSuccessAt?: number;
  lastFailureAt?: number;
  lastResponseMs?: number;
  lastError?: string;
};

export type BackendProviderDefinition = {
  id: string;
  name: string;
  description?: string;
  mediaTypes: BackendMediaType[];
  capabilities: BackendProviderCapability[];
  status: BackendProviderStatus;
  statusNote?: string;
  enabledByDefault?: boolean;
  /** Trusted configured upstream key (never accept arbitrary user URLs). */
  configKey?: 'consumet' | 'novel' | 'scraper';
};

export type BackendSearchResult = {
  id: string;
  providerId: string;
  sourceId: string;
  mediaType: BackendMediaType;
  title: string;
  coverUrl?: string;
  author?: string;
  description?: string;
  genres?: string[];
  status?: string;
};

export type BackendNormalizedMedia = {
  providerId: string;
  sourceId: string;
  mediaType: BackendMediaType;
  title: string;
  alternativeTitles?: string[];
  description?: string;
  coverUrl?: string;
  bannerUrl?: string;
  genres?: string[];
  status?: string;
  author?: string;
  artist?: string;
  rating?: number;
  language?: string;
};

export type BackendNormalizedChapter = {
  id: string;
  providerId: string;
  sourceId?: string;
  mediaId: string;
  title: string;
  chapterNumber: number;
  volumeNumber?: number;
  language?: string;
  releaseDate?: string;
  wordCount?: number;
};

export type BackendNormalizedEpisode = {
  id: string;
  providerId: string;
  mediaId: string;
  episodeNumber: number;
  title: string;
  language?: string;
};

export type BackendNormalizedPage = {
  pageNumber: number;
  imageUrl: string;
  aspectRatio?: number;
};

export type BackendNormalizedNovelContent = {
  providerId: string;
  mediaId: string;
  chapterId: string;
  title?: string;
  paragraphs: string[];
  wordCount?: number;
  language?: string;
  previousChapterId?: string;
  nextChapterId?: string;
};

export type BackendNormalizedPlaybackSource = {
  providerId: string;
  sourceId: string;
  mediaId: string;
  episodeId: string;
  url: string;
  quality?: string;
  subtitles?: { language: string; url: string }[];
  availability?: 'available' | 'unavailable' | 'demo';
  isDemo?: boolean;
  note?: string;
};

export type ContentProviderAdapter = {
  definition: BackendProviderDefinition;
  search?(query: string, mediaType?: BackendMediaType): Promise<BackendSearchResult[]>;
  getDetails?(sourceId: string, mediaType?: BackendMediaType): Promise<BackendNormalizedMedia>;
  getChapters?(sourceId: string): Promise<BackendNormalizedChapter[]>;
  getPages?(sourceId: string, chapterId: string): Promise<BackendNormalizedPage[]>;
  getEpisodes?(sourceId: string): Promise<BackendNormalizedEpisode[]>;
  getNovelContent?(sourceId: string, chapterId: string): Promise<BackendNormalizedNovelContent>;
  getPlaybackSource?(
    sourceId: string,
    episodeId: string,
  ): Promise<BackendNormalizedPlaybackSource>;
};

export class ProviderGatewayError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'PROVIDER_ERROR') {
    super(message);
    this.name = 'ProviderGatewayError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
