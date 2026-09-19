import {
  getJikanAnime,
  getJikanAnimeEpisodes,
  searchJikanAnime,
} from '@/providers/jikan/client';
import type { MediaProvider } from '@/providers/types';
import type {
  MediaRef,
  NormalizedEpisode,
  NormalizedMedia,
} from '@/types/provider';
import { encodeMediaRouteId } from '@/types/provider';
import type { SearchResult } from '@/types/search';

const PROVIDER_ID = 'jikan-anime';

export const jikanAnimeProvider: MediaProvider = {
  definition: {
    id: PROVIDER_ID,
    name: 'Jikan (MyAnimeList)',
    website: 'https://jikan.moe',
    description: 'Official open MyAnimeList API for anime metadata, episodes, and schedules.',
    mediaTypes: ['anime'],
    capabilities: ['search', 'details', 'episodes', 'images', 'recommendations'],
    status: 'working',
    statusNote: 'Public anime metadata API. Playback is handled by a separate video playback resolver.',
    attribution: 'Data provided by MyAnimeList via Jikan API.',
    executionMode: 'public-api',
    health: {},
  },

  async search(query, context) {
    const results = await searchJikanAnime(query, context.limit ?? 12, context.signal);
    return results.map((item): SearchResult => ({
      id: encodeMediaRouteId(PROVIDER_ID, String(item.mal_id)),
      providerId: PROVIDER_ID,
      sourceId: String(item.mal_id),
      title: item.title_english || item.title,
      coverUrl: item.images.jpg.large_image_url || item.images.jpg.image_url,
      type: 'anime',
        episodeCount: Number.isSafeInteger(item.episodes) && (item.episodes ?? 0) > 0 ? item.episodes : undefined,
      subtitle: item.type ? `${item.type} · ${item.episodes ? `${item.episodes} eps` : 'Ongoing'}` : 'Anime',
      tags: ['Anime', ...item.genres.slice(0, 2).map((g) => g.name)],
    }));
  },

  async getDetails(ref: MediaRef): Promise<NormalizedMedia> {
    const item = await getJikanAnime(ref.sourceId);
    return {
      ref,
      mediaType: 'anime',
      title: item.title_english || item.title,
      alternativeTitles: [item.title, item.title_japanese].filter(Boolean) as string[],
      description: item.synopsis || '',
      coverUrl: item.images.jpg.large_image_url || item.images.jpg.image_url,
      bannerUrl: item.images.jpg.large_image_url || item.images.jpg.image_url,
      genres: item.genres.map((g) => g.name),
      status: item.status?.toLowerCase().includes('finished') ? 'completed' : 'ongoing',
      rating: item.score ? item.score / 2 : undefined, // Convert 10-scale to 5-scale
    };
  },

  async getEpisodes(ref: MediaRef): Promise<NormalizedEpisode[]> {
    const episodes = await getJikanAnimeEpisodes(ref.sourceId);
    if (episodes.length > 0) {
      return episodes.map((ep, index) => ({
        id: String(ep.mal_id || index + 1),
        number: ep.mal_id || index + 1,
        title: ep.title || `Episode ${ep.mal_id || index + 1}`,
        airDate: ep.aired,
      }));
    }

    // If episodes endpoint didn't return specific items, generate episode list from metadata
    const item = await getJikanAnime(ref.sourceId);
    const count = item.episodes && item.episodes > 0 ? item.episodes : 12;
    return Array.from({ length: count }, (_, i) => ({
      id: String(i + 1),
      number: i + 1,
      title: `Episode ${i + 1}`,
    }));
  },
};
