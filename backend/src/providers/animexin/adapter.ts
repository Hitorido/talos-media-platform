import { load } from 'cheerio';
import { checkedId, sourceText } from '../shared/sourceHttp.js';
import { ProviderGatewayError, type ContentProviderAdapter } from '../types.js';

const origin = 'https://animexin.dev';
const providerId = 'animexin';
const slug = (value: string) => checkedId(value, /^[a-z0-9][a-z0-9-]{0,220}$/);
function sourceSlug(href?: string): string | undefined {
  if (!href) return;
  const url = new URL(href, origin);
  if (url.origin !== origin || url.username || url.password) return;
  return url.pathname.match(/^\/(?:anime\/)?([a-z0-9-]+)\/$/)?.[1];
}
export function checkedEnglishFile(href: string): URL | undefined {
  const url = new URL(href, origin);
  if (url.origin !== 'https://www.mediafire.com' || url.username || url.password) return;
  if (!/^\/file\/[a-z0-9]+\/[^/]*[_-]eng(?:lish)?(?:[_-][^/]*)?\.mp4\/file$/i.test(url.pathname))
    return;
  return url;
}
export function checkedDownloadUrl(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    !/^download[0-9]+\.mediafire\.com$/.test(url.hostname) ||
    url.username ||
    url.password ||
    !url.pathname.toLowerCase().endsWith('.mp4')
  )
    throw new ProviderGatewayError('Unsupported public video URL.', 502);
  return url.href;
}

/** Public English MP4 links only. Browser-only embeds and unlabelled language files are excluded. */
export const animeXinAdapter: ContentProviderAdapter = {
  definition: {
    id: providerId,
    name: 'AnimeXin',
    mediaTypes: ['anime'],
    capabilities: ['search', 'details', 'episodes', 'streaming'],
    status: 'limited',
    enabledByDefault: true,
    statusNote:
      'Public English-labelled MediaFire MP4 episodes only. Soul Land 2 episode 1 full media verified locally; other hosts and production/native playback unverified.',
  },
  async search(query) {
    const $ = load(await sourceText(origin, '/?s=' + encodeURIComponent(query)));
    const seen = new Set<string>();
    return $('.bsx > a')
      .toArray()
      .flatMap((element) => {
        const a = $(element),
          sourceId = sourceSlug(a.attr('href'));
        const title = a.find('h2').text().trim() || a.attr('title')?.trim();
        if (!sourceId || !title || seen.has(sourceId)) return [];
        seen.add(sourceId);
        return [
          {
            id: sourceId,
            providerId,
            sourceId,
            mediaType: 'anime' as const,
            title,
            coverUrl: a.find('img').attr('src'),
          },
        ];
      })
      .slice(0, 20);
  },
  async getDetails(sourceId) {
    const $ = load(await sourceText(origin, '/' + slug(sourceId) + '/'));
    const title = $('h1').first().text().trim();
    if (!title) throw new ProviderGatewayError('Series unavailable.', 404);
    return {
      providerId,
      sourceId,
      mediaType: 'anime',
      title,
      alternativeTitles: [
        sourceId.replace(/-/g, ' '),
        ...$('.alter')
          .text()
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      ],
      coverUrl: $('meta[property="og:image"]').attr('content'),
      description: $('.entry-content').first().text().trim(),
      genres: [],
    };
  },
  async getEpisodes(sourceId) {
    const $ = load(await sourceText(origin, '/' + slug(sourceId) + '/'));
    const seen = new Set<string>();
    return $('.eplister a')
      .toArray()
      .flatMap((element) => {
        const a = $(element),
          id = sourceSlug(a.attr('href'));
        const numberText = a.find('.epl-num').text().trim();
        // Multi-episode compilations cannot silently stand in for one episode.
        if (!/^\d+(?:\.\d+)?$/.test(numberText)) return [];
        const episodeNumber = Number(numberText);
        if (!id || seen.has(id) || episodeNumber <= 0) return [];
        seen.add(id);
        return [
          {
            id,
            providerId,
            mediaId: sourceId,
            episodeNumber,
            title: a.find('.epl-title').text().trim() || 'Episode ' + episodeNumber,
          },
        ];
      })
      .sort((a, b) => a.episodeNumber - b.episodeNumber);
  },
  async getPlaybackSource(sourceId, episodeId) {
    slug(sourceId);
    slug(episodeId);
    const episodes = await animeXinAdapter.getEpisodes!(sourceId);
    if (!episodes.some((episode) => episode.id === episodeId))
      throw new ProviderGatewayError('Episode not listed for this series.', 404);
    const $ = load(await sourceText(origin, '/' + episodeId + '/'));
    const file = $('a[href]')
      .toArray()
      .map((a) => checkedEnglishFile($(a).attr('href')!))
      .find(Boolean);
    if (!file)
      throw new ProviderGatewayError('No supported public English MP4 for this episode.', 502);
    const download = load(await sourceText(file.origin, file.pathname));
    const href = download('#downloadButton').attr('href');
    if (!href) throw new ProviderGatewayError('The public English video is unavailable.', 502);
    const url = checkedDownloadUrl(href);
    return {
      providerId,
      sourceId,
      mediaId: sourceId,
      episodeId,
      url,
      contentType: 'progressive',
      availability: 'available',
      note: 'AnimeXin English-labelled MP4. Captions are embedded in the picture and cannot be switched off. Other hosts are not supported.',
    };
  },
};
