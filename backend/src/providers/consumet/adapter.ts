import { ENV } from '../../config/env.js';
import type { ContentProviderAdapter } from '../types.js';
import { ProviderGatewayError, type BackendNormalizedEpisode, type BackendNormalizedMedia, type BackendNormalizedPlaybackSource, type BackendSearchResult } from '../types.js';

const PUBLIC_CONSUMET = 'https://api.consumet.org';

function resolveConsumetStatus() {
  const configured = ENV.CONSUMET_BASE_URL.trim();
  if (!configured) {
    return {
      status: 'requires-configuration' as const,
      note: 'Set CONSUMET_BASE_URL to a self-hosted Consumet instance. Public api.consumet.org returns HTTP 451.',
    };
  }
  if (configured.replace(/\/$/, '') === PUBLIC_CONSUMET) {
    return {
      status: 'unavailable' as const,
      note: 'Public api.consumet.org is unavailable (HTTP 451). Use a self-hosted Consumet URL.',
    };
  }
  return {
    status: 'limited' as const,
    note: 'Custom Consumet URL configured. Adapter methods are reserved for gradual integration; not claimed fully working yet.',
  };
}

type ConsumetResponse = {
  results?: Array<{ id: string; title?: string; image?: string; description?: string }>;
  id?: string;
  title?: string;
  image?: string;
  description?: string;
  genres?: string[];
  status?: string;
  episodes?: Array<{ id: string; title?: string; number?: number; image?: string }>;
  sources?: Array<{ url: string; quality?: string; isM3U8?: boolean }>;
  subtitles?: Array<{ url: string; lang?: string; language?: string }>;
};

function ensureConfigured(): string {
  const baseUrl = ENV.CONSUMET_BASE_URL.trim().replace(/\/$/, '');
  if (!baseUrl || baseUrl === PUBLIC_CONSUMET) {
    throw new ProviderGatewayError(
      'Configure CONSUMET_BASE_URL with a reachable self-hosted Consumet-compatible endpoint.',
      503,
      'REQUIRES_CONFIGURATION',
    );
  }
  return baseUrl;
}

async function consumetRequest(path: string): Promise<ConsumetResponse> {
  const baseUrl = ensureConfigured();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ENV.PROVIDER_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Talos/1.0' },
    });
    if (!response.ok) {
      throw new ProviderGatewayError(
        `Consumet request failed with HTTP ${response.status}.`,
        response.status === 404 ? 502 : response.status,
        response.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_FAILED',
      );
    }
    return (await response.json()) as ConsumetResponse;
  } catch (error) {
    if (error instanceof ProviderGatewayError) throw error;
    throw new ProviderGatewayError(
      error instanceof Error && error.name === 'AbortError'
        ? 'Consumet request timed out.'
        : `Consumet request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      502,
      'UPSTREAM_FAILED',
    );
  } finally {
    clearTimeout(timeout);
  }
}

const consumetMeta = resolveConsumetStatus();

/**
 * Backend Consumet proxy adapter foundation.
 * Does not scrape sites and does not claim the public Consumet API works.
 */
export const consumetProviderAdapter: ContentProviderAdapter = {
  definition: {
    id: 'proxy-consumet',
    name: 'Consumet Proxy',
    description:
      'Optional self-hosted Consumet-compatible proxy for manga/anime. Public Consumet is unavailable.',
    mediaTypes: ['anime'],
    capabilities: ['search', 'details', 'episodes', 'streaming'],
    status: consumetMeta.status,
    statusNote: consumetMeta.note,
    enabledByDefault: false,
    configKey: 'consumet',
  },

  async search(query, mediaType) {
    if (mediaType !== 'anime') {
      throw new ProviderGatewayError('Backend Consumet adapter currently supports anime only.', 400, 'MEDIA_TYPE_MISMATCH');
    }
    const payload = await consumetRequest(`/anime/gogoanime/${encodeURIComponent(query)}?page=1`);
    return (payload.results ?? []).map((item): BackendSearchResult => ({
      id: item.id,
      providerId: 'proxy-consumet',
      sourceId: item.id,
      mediaType: 'anime',
      title: item.title ?? item.id,
      coverUrl: item.image,
    }));
  },

  async getDetails(sourceId, mediaType): Promise<BackendNormalizedMedia> {
    if (mediaType !== 'anime') {
      throw new ProviderGatewayError('Backend Consumet adapter currently supports anime only.', 400, 'MEDIA_TYPE_MISMATCH');
    }
    const payload = await consumetRequest(`/anime/gogoanime/info/${encodeURIComponent(sourceId)}`);
    return {
      providerId: 'proxy-consumet',
      sourceId,
      mediaType: 'anime',
      title: payload.title ?? sourceId,
      description: payload.description,
      coverUrl: payload.image,
      genres: payload.genres,
      status: payload.status,
    };
  },

  async getEpisodes(sourceId): Promise<BackendNormalizedEpisode[]> {
    const payload = await consumetRequest(`/anime/gogoanime/info/${encodeURIComponent(sourceId)}`);
    return (payload.episodes ?? []).map((episode, index) => ({
      id: episode.id,
      providerId: 'proxy-consumet',
      mediaId: sourceId,
      episodeNumber: episode.number ?? index + 1,
      title: episode.title ?? `Episode ${episode.number ?? index + 1}`,
    }));
  },

  async getPlaybackSource(sourceId, episodeId): Promise<BackendNormalizedPlaybackSource> {
    const payload = await consumetRequest(`/anime/gogoanime/watch/${encodeURIComponent(episodeId)}`);
    const source = payload.sources?.find((item) => item.quality === '1080p') ?? payload.sources?.[0];
    if (!source?.url) {
      throw new ProviderGatewayError('Consumet returned no playable sources.', 502, 'NO_PLAYABLE_SOURCE');
    }
    return {
      providerId: 'proxy-consumet',
      sourceId,
      mediaId: sourceId,
      episodeId,
      url: source.url,
      quality: source.quality,
      subtitles: (payload.subtitles ?? []).map((subtitle) => ({
        language: subtitle.lang ?? subtitle.language ?? 'unknown',
        url: subtitle.url,
      })),
      availability: 'available',
      note: 'Playback resolved through the configured Consumet-compatible endpoint.',
    };
  },

};
