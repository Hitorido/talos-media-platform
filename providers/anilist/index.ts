import { getAniListAnime, searchAniListAnime } from '@/providers/anilist/client';
import type { MediaProvider } from '@/providers/types';
import type {
  MediaRef,
  NormalizedEpisode,
  NormalizedMedia,
} from '@/types/provider';
import { encodeMediaRouteId } from '@/types/provider';
import type { SearchResult } from '@/types/search';

const PROVIDER_ID = 'anilist-anime';

function cleanHtmlDescription(raw?: string): string {
  if (!raw) return '';
  return raw.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[^>]+(>|$)/g, '').trim();
}

export const aniListAnimeProvider: MediaProvider = {
  definition: {
    id: PROVIDER_ID,
    name: 'AniList',
    website: 'https://anilist.co',
    description: 'High-speed public anime catalog via AniList GraphQL API.',
    mediaTypes: ['anime'],
    capabilities: ['search', 'details', 'episodes', 'images', 'recommendations'],
    status: 'working',
    statusNote: 'Official AniList GraphQL API. Real-time anime metadata and episodes.',
    attribution: 'Data provided by AniList.co',
    executionMode: 'public-api',
    health: {},
  },

  async search(query, context) {
    const results = await searchAniListAnime(query, context.limit ?? 12);
    return results.map((item): SearchResult => {
      const title = item.title.english || item.title.romaji || item.title.native || 'Anime';
      const coverUrl =
        item.coverImage?.extraLarge ||
        item.coverImage?.large ||
        item.coverImage?.medium ||
        'https://placehold.co/400x600/1f2937/9ca3af?text=Anime';

      const format = item.format ? item.format.replace(/_/g, ' ') : 'Anime';
      const epLabel = item.episodes ? `${item.episodes} eps` : 'Ongoing';
      const subtitle = `${format} · ${epLabel}`;

      return {
        id: encodeMediaRouteId(PROVIDER_ID, String(item.id)),
        providerId: PROVIDER_ID,
        sourceId: String(item.id),
        title,
        coverUrl,
        type: 'anime',
        subtitle,
        tags: ['Anime', ...(item.genres ?? []).slice(0, 2)],
      };
    });
  },

  async getDetails(ref: MediaRef): Promise<NormalizedMedia> {
    const item = await getAniListAnime(ref.sourceId);
    const title = item.title.english || item.title.romaji || item.title.native || 'Anime';
    const altTitles = [item.title.romaji, item.title.english, item.title.native].filter(
      (t): t is string => Boolean(t) && t !== title,
    );
    const coverUrl =
      item.coverImage?.extraLarge ||
      item.coverImage?.large ||
      item.coverImage?.medium ||
      'https://placehold.co/400x600/1f2937/9ca3af?text=Anime';

    return {
      ref,
      mediaType: 'anime',
      title,
      alternativeTitles: altTitles,
      description: cleanHtmlDescription(item.description),
      coverUrl,
      bannerUrl: item.bannerImage || coverUrl,
      genres: item.genres ?? ['Anime'],
      status: item.status === 'FINISHED' ? 'completed' : 'ongoing',
      rating: item.averageScore ? item.averageScore / 20 : undefined, // Convert 100-scale to 5-scale
      author: item.studios?.nodes?.[0]?.name,
    };
  },

  async getEpisodes(ref: MediaRef): Promise<NormalizedEpisode[]> {
    const item = await getAniListAnime(ref.sourceId);
    const count = item.episodes && item.episodes > 0 ? item.episodes : 12;

    return Array.from({ length: count }, (_, i) => ({
      id: String(i + 1),
      number: i + 1,
      title: `Episode ${i + 1}`,
      durationSeconds: 1440,
    }));
  },
};
