import { directAnimeAdapter, withDirectAnimeFallback } from './directAnime';
import { apiRequestWithWake as apiRequest } from '@/services/api/client';
import type { MediaProvider } from '@/providers/types';
import {
  encodeMediaRouteId,
  type NormalizedMedia,
  type NormalizedPlaybackSource,
} from '@/types/provider';

/** Anime gateway bridge; metadata cards stay in AniList while playback resolves here. */
export function backendAnimeProvider(
  id: string,
  name: string,
  options?: { website: string; statusNote: string },
): MediaProvider {
  const route = (sourceId: string) => `/api/content/anime/${id}/${encodeURIComponent(sourceId)}`;
  const request = <T>(path: string, direct?: () => Promise<T>, signal?: AbortSignal) =>
    withDirectAnimeFallback(() => apiRequest<T>(path, { signal }), direct, signal);
  const details = (sourceId: string, signal?: AbortSignal) => {
    const direct = directAnimeAdapter(id, signal);
    return request<Omit<NormalizedMedia, 'ref'>>(
      route(sourceId),
      direct
        ? async () => {
            const data = await direct.getDetails!(sourceId);
            return {
              ...data,
              mediaType: 'anime' as const,
              coverUrl: data.coverUrl ?? '',
              genres: data.genres ?? [],
            };
          }
        : undefined,
      signal,
    );
  };
  return {
    definition: {
      id,
      name,
      website: options?.website ?? 'https://donghuastream.org',
      mediaTypes: ['anime'],
      capabilities: ['search', 'details', 'episodes', 'streaming'],
      status: 'limited',
      statusNote:
        options?.statusNote ??
        'Rumble-hosted donghua episodes. Other hosts remain unavailable; native phone verification pending.',
      executionMode: 'backend-api',
      backendRequired: !directAnimeAdapter(id),
      health: {},
    },
    async search(query, context) {
      const direct = directAnimeAdapter(id, context.signal);
      const data = await request<{
        results: { sourceId: string; title: string; coverUrl?: string }[];
      }>(
        `/api/content/search?providerId=${id}&mediaType=anime&q=${encodeURIComponent(query)}`,
        direct ? async () => ({ results: await direct.search!(query) }) : undefined,
        context.signal,
      );
      // This bridge is playback-only in global search; verify aliases from at most three candidates.
      return Promise.all(
        data.results.slice(0, 3).map(async (item) => {
          const detail = await details(item.sourceId, context.signal);
          return {
            alternativeTitles: detail.alternativeTitles,
            id: encodeMediaRouteId(id, item.sourceId),
            providerId: id,
            sourceId: item.sourceId,
            title: item.title,
            coverUrl: item.coverUrl ?? '',
            type: 'anime' as const,
            subtitle: name,
            tags: [name],
          };
        }),
      );
    },
    async getDetails(ref) {
      const data = await details(ref.sourceId);
      return { ...data, ref, genres: data.genres ?? [], coverUrl: data.coverUrl ?? '' };
    },
    async getEpisodes(ref) {
      const direct = directAnimeAdapter(id);
      const data = await request<{
        episodes: { id: string; episodeNumber: number; title: string }[];
      }>(
        route(ref.sourceId) + '/episodes',
        direct ? async () => ({ episodes: await direct.getEpisodes!(ref.sourceId) }) : undefined,
      );
      return data.episodes.map((episode) => ({ ...episode, number: episode.episodeNumber }));
    },
    async getPlaybackSource(ref, episodeId) {
      const direct = directAnimeAdapter(id);
      return request<NormalizedPlaybackSource>(
        route(ref.sourceId) + '/episodes/' + encodeURIComponent(episodeId) + '/playback',
        direct ? () => direct.getPlaybackSource!(ref.sourceId, episodeId) : undefined,
      );
    },
  };
}
