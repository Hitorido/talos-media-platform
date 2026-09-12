import {
  findProvidersByMediaType,
  getProvider,
  getProviderStatus,
  isProviderEnabled,
  recordProviderFailure,
  recordProviderSuccess,
} from './registry.js';
import type {
  BackendMediaType,
  BackendNormalizedChapter,
  BackendNormalizedEpisode,
  BackendNormalizedMedia,
  BackendNormalizedNovelContent,
  BackendNormalizedPage,
  BackendNormalizedPlaybackSource,
  BackendProviderCapability,
  BackendSearchResult,
  ContentProviderAdapter,
} from './types.js';
import { ProviderGatewayError } from './types.js';

const USABLE_STATUSES = new Set([
  'working',
  'available',
  'limited',
  'demo',
  'requires-configuration',
]);

function assertMediaType(mediaType: string): BackendMediaType {
  const allowed: BackendMediaType[] = [
    'manga',
    'manhwa',
    'manhua',
    'anime',
    'novel',
    'movie',
    'tv',
  ];
  if (!allowed.includes(mediaType as BackendMediaType)) {
    throw new ProviderGatewayError(`Unsupported media type "${mediaType}".`, 400, 'INVALID_MEDIA_TYPE');
  }
  return mediaType as BackendMediaType;
}

function assertProviderId(providerId: string): void {
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(providerId)) {
    throw new ProviderGatewayError('Invalid provider id.', 400, 'INVALID_PROVIDER_ID');
  }
}

function assertSourceId(sourceId: string): void {
  if (!sourceId || sourceId.length > 512 || sourceId.includes('://')) {
    throw new ProviderGatewayError('Invalid media/source id.', 400, 'INVALID_SOURCE_ID');
  }
}

function providerSupports(
  adapter: ContentProviderAdapter,
  capability: BackendProviderCapability,
): boolean {
  return adapter.definition.capabilities.includes(capability);
}

function assertCapability(
  adapter: ContentProviderAdapter,
  capability: BackendProviderCapability,
): void {
  if (!providerSupports(adapter, capability)) {
    throw new ProviderGatewayError(
      `Provider "${adapter.definition.id}" does not support capability "${capability}".`,
      501,
      'UNSUPPORTED_CAPABILITY',
    );
  }
}

function assertUsable(adapter: ContentProviderAdapter): void {
  if (!isProviderEnabled(adapter.definition.id)) {
    throw new ProviderGatewayError(
      `Provider "${adapter.definition.id}" is disabled.`,
      403,
      'PROVIDER_DISABLED',
    );
  }

  const status = getProviderStatus(adapter.definition.id);
  if (status === 'disabled') {
    throw new ProviderGatewayError(
      `Provider "${adapter.definition.id}" is disabled.`,
      403,
      'PROVIDER_DISABLED',
    );
  }
  if (status === 'unavailable' || status === 'broken') {
    throw new ProviderGatewayError(
      `Provider "${adapter.definition.id}" is currently ${status}.`,
      503,
      'PROVIDER_UNAVAILABLE',
    );
  }
  if (status === 'planned') {
    throw new ProviderGatewayError(
      `Provider "${adapter.definition.id}" is planned and not implemented yet.`,
      501,
      'PROVIDER_PLANNED',
    );
  }
}

async function withHealth<T>(providerId: string, operation: () => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    const result = await operation();
    recordProviderSuccess(providerId, Date.now() - started);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Provider request failed';
    recordProviderFailure(providerId, message, Date.now() - started);
    throw error;
  }
}

function orderProviders(
  adapters: ContentProviderAdapter[],
  preferredProviderId?: string,
): ContentProviderAdapter[] {
  return [...adapters].sort((a, b) => {
    if (preferredProviderId) {
      if (a.definition.id === preferredProviderId && b.definition.id !== preferredProviderId) {
        return -1;
      }
      if (b.definition.id === preferredProviderId && a.definition.id !== preferredProviderId) {
        return 1;
      }
    }
    const rank = (status: string) => {
      switch (status) {
        case 'working':
        case 'available':
          return 0;
        case 'limited':
        case 'demo':
          return 1;
        case 'requires-configuration':
          return 2;
        default:
          return 3;
      }
    };
    const diff =
      rank(getProviderStatus(a.definition.id)) - rank(getProviderStatus(b.definition.id));
    if (diff !== 0) return diff;
    return a.definition.name.localeCompare(b.definition.name);
  });
}

function resolveAdapter(
  providerId: string,
  mediaType: BackendMediaType,
  capability: BackendProviderCapability,
): ContentProviderAdapter {
  assertProviderId(providerId);
  const adapter = getProvider(providerId);
  if (!adapter) {
    throw new ProviderGatewayError(`Unknown provider "${providerId}".`, 404, 'PROVIDER_NOT_FOUND');
  }
  if (!adapter.definition.mediaTypes.includes(mediaType)) {
    throw new ProviderGatewayError(
      `Provider "${providerId}" does not support media type "${mediaType}".`,
      400,
      'MEDIA_TYPE_MISMATCH',
    );
  }
  assertUsable(adapter);
  assertCapability(adapter, capability);
  return adapter;
}

/**
 * Unified content gateway: selects providers, validates capabilities, normalizes errors.
 * Provider-specific network logic stays inside adapters.
 */
export const contentGateway = {
  search: async (params: {
    mediaType: string;
    query: string;
    providerId?: string;
    preferredProviderId?: string;
  }): Promise<{ results: BackendSearchResult[]; attemptedProviders: string[] }> => {
    const mediaType = assertMediaType(params.mediaType);
    const query = params.query.trim();
    if (!query) {
      throw new ProviderGatewayError('Query parameter "q" is required.', 400, 'INVALID_QUERY');
    }

    if (params.providerId) {
      const adapter = resolveAdapter(params.providerId, mediaType, 'search');
      if (!adapter.search) {
        throw new ProviderGatewayError(
          `Provider "${adapter.definition.id}" search is not implemented.`,
          501,
          'UNSUPPORTED_CAPABILITY',
        );
      }
      const results = await withHealth(adapter.definition.id, () =>
        adapter.search!(query, mediaType),
      );
      return { results, attemptedProviders: [adapter.definition.id] };
    }

    const candidates = orderProviders(
      findProvidersByMediaType(mediaType).filter(
        (adapter) =>
          isProviderEnabled(adapter.definition.id) &&
          providerSupports(adapter, 'search') &&
          Boolean(adapter.search) &&
          USABLE_STATUSES.has(getProviderStatus(adapter.definition.id)),
      ),
      params.preferredProviderId,
    );

    const attemptedProviders: string[] = [];
    const errors: string[] = [];
    const merged: BackendSearchResult[] = [];

    for (const adapter of candidates) {
      attemptedProviders.push(adapter.definition.id);
      try {
        const results = await withHealth(adapter.definition.id, () =>
          adapter.search!(query, mediaType),
        );
        merged.push(...results);
      } catch (error) {
        errors.push(
          `${adapter.definition.id}: ${error instanceof Error ? error.message : 'failed'}`,
        );
      }
    }

    if (merged.length === 0 && candidates.length > 0) {
      throw new ProviderGatewayError(
        `No search results from compatible providers. ${errors.join(' | ')}`,
        502,
        'SEARCH_FAILED',
      );
    }

    if (candidates.length === 0) {
      throw new ProviderGatewayError(
        `No enabled backend providers support search for "${mediaType}".`,
        503,
        'NO_PROVIDERS',
      );
    }

    return { results: merged, attemptedProviders };
  },

  getDetails: async (
    mediaTypeRaw: string,
    providerId: string,
    mediaId: string,
  ): Promise<BackendNormalizedMedia> => {
    const mediaType = assertMediaType(mediaTypeRaw);
    assertSourceId(mediaId);
    const adapter = resolveAdapter(providerId, mediaType, 'details');
    if (!adapter.getDetails) {
      throw new ProviderGatewayError(
        `Provider "${providerId}" details are not implemented.`,
        501,
        'UNSUPPORTED_CAPABILITY',
      );
    }
    return withHealth(providerId, () => adapter.getDetails!(mediaId, mediaType));
  },

  getChapters: async (
    mediaTypeRaw: string,
    providerId: string,
    mediaId: string,
  ): Promise<BackendNormalizedChapter[]> => {
    const mediaType = assertMediaType(mediaTypeRaw);
    assertSourceId(mediaId);
    const adapter = resolveAdapter(providerId, mediaType, 'chapters');
    if (!adapter.getChapters) {
      throw new ProviderGatewayError(
        `Provider "${providerId}" chapters are not implemented.`,
        501,
        'UNSUPPORTED_CAPABILITY',
      );
    }
    return withHealth(providerId, () => adapter.getChapters!(mediaId));
  },

  getPages: async (
    mediaTypeRaw: string,
    providerId: string,
    mediaId: string,
    chapterId: string,
  ): Promise<BackendNormalizedPage[]> => {
    const mediaType = assertMediaType(mediaTypeRaw);
    assertSourceId(mediaId);
    assertSourceId(chapterId);
    const adapter = resolveAdapter(providerId, mediaType, 'pages');
    if (!adapter.getPages) {
      throw new ProviderGatewayError(
        `Provider "${providerId}" pages are not implemented.`,
        501,
        'UNSUPPORTED_CAPABILITY',
      );
    }
    return withHealth(providerId, () => adapter.getPages!(mediaId, chapterId));
  },

  getEpisodes: async (
    mediaTypeRaw: string,
    providerId: string,
    mediaId: string,
  ): Promise<BackendNormalizedEpisode[]> => {
    const mediaType = assertMediaType(mediaTypeRaw);
    assertSourceId(mediaId);
    const adapter = resolveAdapter(providerId, mediaType, 'episodes');
    if (!adapter.getEpisodes) {
      throw new ProviderGatewayError(
        `Provider "${providerId}" episodes are not implemented.`,
        501,
        'UNSUPPORTED_CAPABILITY',
      );
    }
    return withHealth(providerId, () => adapter.getEpisodes!(mediaId));
  },

  getNovelContent: async (
    providerId: string,
    mediaId: string,
    chapterId: string,
  ): Promise<BackendNormalizedNovelContent> => {
    assertSourceId(mediaId);
    assertSourceId(chapterId);
    const adapter = resolveAdapter(providerId, 'novel', 'textContent');
    if (!adapter.getNovelContent) {
      throw new ProviderGatewayError(
        `Provider "${providerId}" does not support novel text content.`,
        501,
        'UNSUPPORTED_CAPABILITY',
      );
    }
    return withHealth(providerId, () => adapter.getNovelContent!(mediaId, chapterId));
  },

  getPlaybackSource: async (
    mediaTypeRaw: string,
    providerId: string,
    mediaId: string,
    episodeId: string,
  ): Promise<BackendNormalizedPlaybackSource> => {
    const mediaType = assertMediaType(mediaTypeRaw);
    assertSourceId(mediaId);
    assertSourceId(episodeId);
    const adapter = resolveAdapter(providerId, mediaType, 'streaming');
    if (!adapter.getPlaybackSource) {
      throw new ProviderGatewayError(
        `Provider "${providerId}" does not support streaming playback.`,
        501,
        'UNSUPPORTED_CAPABILITY',
      );
    }
    return withHealth(providerId, () => adapter.getPlaybackSource!(mediaId, episodeId));
  },
};
