import { apiRequest } from '@/services/api/client';

export type BackendContentProviderSummary = {
  id: string;
  name: string;
  description?: string;
  mediaTypes: string[];
  capabilities: string[];
  status: string;
  statusNote?: string;
  enabled: boolean;
  health?: {
    lastSuccessAt?: number;
    lastFailureAt?: number;
    lastResponseMs?: number;
    lastError?: string;
  };
};

/**
 * Optional Expo client for the unified backend content gateway.
 * Direct providers (MangaDex/Jikan/etc.) remain the primary path unless a backend provider is chosen.
 */
export async function fetchBackendContentProviders() {
  return apiRequest<{ providers: BackendContentProviderSummary[] }>('/api/content/providers');
}

export async function searchBackendContent(params: {
  mediaType: string;
  query: string;
  providerId?: string;
  preferredProviderId?: string;
}) {
  const search = new URLSearchParams();
  search.set('mediaType', params.mediaType);
  search.set('q', params.query);
  if (params.providerId) search.set('providerId', params.providerId);
  if (params.preferredProviderId) {
    search.set('preferredProviderId', params.preferredProviderId);
  }

  return apiRequest<{
    results: unknown[];
    attemptedProviders: string[];
  }>(`/api/content/search?${search.toString()}`);
}

export async function fetchBackendMediaDetails(
  mediaType: string,
  providerId: string,
  mediaId: string,
) {
  return apiRequest<unknown>(
    `/api/content/${encodeURIComponent(mediaType)}/${encodeURIComponent(providerId)}/${encodeURIComponent(mediaId)}`,
  );
}

export async function fetchBackendChapters(
  mediaType: string,
  providerId: string,
  mediaId: string,
) {
  return apiRequest<{ chapters: unknown[] }>(
    `/api/content/${encodeURIComponent(mediaType)}/${encodeURIComponent(providerId)}/${encodeURIComponent(mediaId)}/chapters`,
  );
}

export async function fetchBackendNovelContent(
  providerId: string,
  mediaId: string,
  chapterId: string,
) {
  return apiRequest<unknown>(
    `/api/content/novel/${encodeURIComponent(providerId)}/${encodeURIComponent(mediaId)}/chapters/${encodeURIComponent(chapterId)}/content`,
  );
}
