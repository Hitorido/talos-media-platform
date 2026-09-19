import { getKitsuAnime, getKitsuEpisodes, searchKitsuAnime } from '@/providers/kitsu/client';
import type { MediaProvider } from '@/providers/types';
import type {
  MediaRef,
  NormalizedEpisode,
  NormalizedMedia,
} from '@/types/provider';
import { encodeMediaRouteId } from '@/types/provider';
import type { SearchResult } from '@/types/search';

const PROVIDER_ID = 'kitsu-anime';

export const kitsuAnimeProvider: MediaProvider = {
  definition: {
    id: PROVIDER_ID,
    name: 'Kitsu (Anime)',
    website: 'https://kitsu.io',
    description: 'Fast, open public Anime catalog via the official Kitsu API.',
    mediaTypes: ['anime'],
    capabilities: ['search', 'details', 'episodes', 'images', 'recommendations'],
    status: 'working',
    statusNote: 'Official Kitsu open JSON-API. Real-time anime metadata and episodes.',
    attribution: 'Data provided by Kitsu.io',
    executionMode: 'public-api',
    health: {},
  },

  async search(query, context) {
    const items = await searchKitsuAnime(query, context.limit ?? 12, context.signal);
    return items.map((item): SearchResult => {
      const attr = item.attributes;
      const title = attr.titles?.en || attr.canonicalTitle || 'Anime';
      const coverUrl =
        attr.posterImage?.large ||
        attr.posterImage?.medium ||
        'https://placehold.co/400x600/1f2937/9ca3af?text=Anime';
      const showType = attr.showType ? attr.showType.toUpperCase() : 'ANIME';
      const epCount = attr.episodeCount ? `${attr.episodeCount} eps` : 'Ongoing';

      return {
        id: encodeMediaRouteId(PROVIDER_ID, item.id),
        providerId: PROVIDER_ID,
        sourceId: item.id,
        title,
        coverUrl,
        type: 'anime',
        episodeCount: Number.isSafeInteger(attr.episodeCount) && (attr.episodeCount ?? 0) > 0 ? attr.episodeCount : undefined,
        subtitle: `${showType} · ${epCount}`,
        tags: ['Anime', showType],
      };
    });
  },

  async getDetails(ref: MediaRef): Promise<NormalizedMedia> {
    const item = await getKitsuAnime(ref.sourceId);
    const attr = item.attributes;
    const title = attr.titles?.en || attr.canonicalTitle || 'Anime';
    const altTitles = [attr.canonicalTitle, attr.titles?.en_jp, attr.titles?.ja_jp].filter(
      (t): t is string => Boolean(t) && t !== title,
    );
    const coverUrl =
      attr.posterImage?.large ||
      attr.posterImage?.medium ||
      'https://placehold.co/400x600/1f2937/9ca3af?text=Anime';
    const bannerUrl = attr.coverImage?.large || attr.coverImage?.original || coverUrl;

    const rating = attr.averageRating ? Number.parseFloat(attr.averageRating) / 20 : undefined;

    return {
      ref,
      mediaType: 'anime',
      title,
      alternativeTitles: altTitles,
      description: attr.synopsis || attr.description || '',
      coverUrl,
      bannerUrl,
      genres: ['Anime'],
      status: attr.status === 'finished' ? 'completed' : 'ongoing',
      rating,
    };
  },

  async getEpisodes(ref: MediaRef): Promise<NormalizedEpisode[]> {
    const epList = await getKitsuEpisodes(ref.sourceId);
    if (epList.length > 0) {
      return epList.map((ep) => ({
        id: ep.id,
        number: ep.number,
        title: ep.title,
        durationSeconds: 1440,
      }));
    }

    const item = await getKitsuAnime(ref.sourceId);
    const count = item.attributes.episodeCount && item.attributes.episodeCount > 0 ? item.attributes.episodeCount : 12;

    return Array.from({ length: count }, (_, i) => ({
      id: String(i + 1),
      number: i + 1,
      title: `Episode ${i + 1}`,
      durationSeconds: (item.attributes.episodeLength ?? 24) * 60,
    }));
  },
};
