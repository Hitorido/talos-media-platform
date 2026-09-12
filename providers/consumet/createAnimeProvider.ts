import {
  consumetAnimeInfo,
  consumetAnimeSearch,
  consumetAnimeWatch,
} from '@/providers/consumet/client';
import type { MediaProvider } from '@/providers/types';
import type {
  MediaRef,
  NormalizedEpisode,
  NormalizedMedia,
  NormalizedPlaybackSource,
  ProviderStatus,
} from '@/types/provider';
import { encodeMediaRouteId } from '@/types/provider';
import type { SearchResult } from '@/types/search';

export type ConsumetAnimeProviderConfig = {
  id: string;
  name: string;
  slug: string;
  website?: string;
  description?: string;
  status?: ProviderStatus;
  statusNote?: string;
};

function pickBestSource(
  sources: { url: string; quality?: string; isM3U8?: boolean }[],
): { url: string; quality?: string; isM3U8?: boolean } | undefined {
  if (sources.length === 0) return undefined;
  const preferredOrder = ['1080p', 'default', '720p', '480p', '360p', 'backup'];
  for (const quality of preferredOrder) {
    const match = sources.find((source) => source.quality?.toLowerCase() === quality);
    if (match) return match;
  }
  return sources[0];
}

export function createConsumetAnimeProvider(config: ConsumetAnimeProviderConfig): MediaProvider {
  const providerId = config.id;

  return {
    definition: {
      id: providerId,
      name: config.name,
      website: config.website,
      description: config.description ?? `Anime streaming via Consumet (${config.slug}).`,
      mediaTypes: ['anime'],
      capabilities: ['search', 'details', 'episodes', 'streaming', 'downloads'],
      status: config.status ?? 'unavailable',
      statusNote:
        config.statusNote ??
        'Requires a reachable Consumet base URL (self-hosted or configured backend gateway). Public api.consumet.org returns HTTP 451.',
      attribution: 'Powered by Consumet API.',
      executionMode: 'public-api',
      backendKey: 'consumet',
      health: {},
    },

    async search(query, context) {
      const response = await consumetAnimeSearch(config.slug, query, 1);
      return (response.results ?? []).slice(0, context.limit ?? 12).map((item): SearchResult => ({
        id: encodeMediaRouteId(providerId, item.id),
        providerId,
        sourceId: item.id,
        title: item.title,
        coverUrl: item.image ?? 'https://placehold.co/400x600/1f2937/9ca3af?text=Anime',
        type: 'anime',
        subtitle: config.name,
        tags: [config.name, 'Streaming'],
      }));
    },

    async getDetails(ref: MediaRef): Promise<NormalizedMedia> {
      const info = await consumetAnimeInfo(config.slug, ref.sourceId);
      return {
        ref,
        mediaType: 'anime',
        title: info.title,
        description: info.description,
        coverUrl: info.image ?? 'https://placehold.co/400x600/1f2937/9ca3af?text=Anime',
        genres: info.genres ?? ['Anime'],
        status: info.status,
      };
    },

    async getEpisodes(ref: MediaRef): Promise<NormalizedEpisode[]> {
      const info = await consumetAnimeInfo(config.slug, ref.sourceId);
      return (info.episodes ?? []).map((episode, index) => ({
        id: episode.id,
        number: episode.number ?? index + 1,
        title: episode.title || `Episode ${episode.number ?? index + 1}`,
        thumbnailUrl: episode.image,
      }));
    },

    async getPlaybackSource(ref: MediaRef, episodeId: string): Promise<NormalizedPlaybackSource> {
      const watch = await consumetAnimeWatch(config.slug, episodeId);
      const best = pickBestSource(watch.sources ?? []);
      if (!best?.url) {
        throw new Error(`No playable sources returned by ${config.name} for this episode.`);
      }

      return {
        providerId,
        sourceId: ref.sourceId,
        mediaId: ref.sourceId,
        episodeId,
        url: best.url,
        quality: best.quality,
        isDirectStream: !best.isM3U8,
        availability: 'available',
        subtitles: (watch.subtitles ?? []).map((subtitle) => ({
          language: subtitle.lang ?? subtitle.language ?? 'unknown',
          url: subtitle.url,
        })),
        note: `Stream from ${config.name} via configured Consumet endpoint.`,
      };
    },
  };
}
