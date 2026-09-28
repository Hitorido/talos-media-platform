import { apiRequest } from '@/services/api/client';
import type { MediaProvider } from '@/providers/types';
import { encodeMediaRouteId, type NormalizedMedia, type NormalizedPlaybackSource } from '@/types/provider';

/** Anime gateway bridge; metadata cards stay in AniList while playback resolves here. */
export function backendAnimeProvider(id: string, name: string): MediaProvider {
  const route = (sourceId: string) => `/api/content/anime/${id}/${encodeURIComponent(sourceId)}`;
  return {
    definition: { id, name, website: 'https://donghuastream.org', mediaTypes: ['anime'], capabilities: ['search', 'details', 'episodes', 'streaming'],
      status: 'limited', statusNote: 'Rumble-hosted donghua episodes. Other hosts remain unavailable; native phone verification pending.', executionMode: 'backend-api', backendRequired: true, health: {} },
    async search(query, context) {
      const data = await apiRequest<{results: {sourceId:string;title:string;coverUrl?:string}[]}>(`/api/content/search?providerId=${id}&mediaType=anime&q=${encodeURIComponent(query)}`, {signal: context.signal});
      return data.results.map(item => ({ id: encodeMediaRouteId(id, item.sourceId), providerId: id, sourceId: item.sourceId, title: item.title, coverUrl: item.coverUrl ?? '', type: 'anime' as const, subtitle: name, tags: [name] }));
    },
    async getDetails(ref) {
      const data = await apiRequest<Omit<NormalizedMedia, 'ref'>>(route(ref.sourceId));
      return { ...data, ref, genres: data.genres ?? [], coverUrl: data.coverUrl ?? '' };
    },
    async getEpisodes(ref) {
      const data = await apiRequest<{episodes: {id:string;episodeNumber:number;title:string}[]}>(route(ref.sourceId) + '/episodes');
      return data.episodes.map(episode => ({ ...episode, number: episode.episodeNumber }));
    },
    async getPlaybackSource(ref, episodeId) {
      return apiRequest<NormalizedPlaybackSource>(route(ref.sourceId) + '/episodes/' + encodeURIComponent(episodeId) + '/playback');
    },
  };
}
