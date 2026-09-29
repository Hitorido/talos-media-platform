import { load } from 'cheerio';
import { checkedId, sourceText } from '../shared/sourceHttp.js';
import { ProviderGatewayError, type ContentProviderAdapter } from '../types.js';

const origin = 'https://donghuastream.org';
const providerId = 'donghuastream';
const slug = (value: string) => checkedId(value, /^[a-z0-9][a-z0-9-]{0,220}$/);

function sourceSlug(href: string | undefined, series: boolean): string | undefined {
  if (!href) return;
  const url = new URL(href, origin);
  if (url.origin !== origin) return;
  return url.pathname.match(series ? /^\/anime\/([a-z0-9-]+)\/$/ : /^\/([a-z0-9-]+)\/$/)?.[1];
}

/** Read only the public JSON object embedded in Rumble's player, without executing scripts. */
export function parseRumbleData(html: string, embedId: string) {
  const marker = `m.f["${embedId}"]=`;
  const start = html.indexOf(marker);
  if (start < 0) throw new ProviderGatewayError('Public video metadata unavailable.', 502);
  const body = html.slice(start + marker.length);
  const end = body.indexOf(',loaded:h()}');
  if (end < 0 || end > 100_000)
    throw new ProviderGatewayError('Unsupported video metadata format.', 502);
  return JSON.parse(body.slice(0, end) + '}') as {
    duration?: number;
    ua?: { tar?: Record<string, { url: string }> };
  };
}

/** Fixed CDN validation: playback URLs come only from the listed episode's public embed. */
function mediaUrl(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    !url.hostname.endsWith('.cdn.rumble.cloud') ||
    !url.pathname.startsWith('/video/') ||
    url.searchParams.get('r_file') !== 'chunklist.m3u8'
  ) {
    throw new ProviderGatewayError('Unsupported video host or playlist.', 502);
  }
  return url.href;
}

export const donghuaStreamAdapter: ContentProviderAdapter = {
  definition: {
    id: providerId,
    name: 'DonghuaStream',
    mediaTypes: ['anime'],
    capabilities: ['search', 'details', 'episodes', 'streaming'],
    status: 'limited',
    enabledByDefault: true,
    statusNote:
      'Public Rumble-hosted episodes only. Soul Land 2 episode 172 media and burned-in English captions verified locally; early embeds and phone playback remain unverified.',
  },
  async search(query) {
    const $ = load(await sourceText(origin, '/?s=' + encodeURIComponent(query)));
    return $('.bsx > a')
      .toArray()
      .flatMap((element) => {
        const a = $(element),
          sourceId = sourceSlug(a.attr('href'), true);
        const title = a.find('h2').text().trim() || a.attr('title')?.trim();
        return sourceId && title
          ? [
              {
                id: sourceId,
                providerId,
                sourceId,
                mediaType: 'anime' as const,
                title,
                coverUrl: a.find('img').attr('src'),
              },
            ]
          : [];
      })
      .slice(0, 20);
  },
  async getDetails(sourceId) {
    const $ = load(await sourceText(origin, '/anime/' + slug(sourceId) + '/'));
    const title = $('h1').first().text().trim();
    if (!title) throw new ProviderGatewayError('Series unavailable.', 404);
    return {
      providerId,
      sourceId,
      mediaType: 'anime',
      title,
      alternativeTitles: $('.alter')
        .text()
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      coverUrl: $('meta[property="og:image"]').attr('content'),
      description: $('.entry-content').first().text().trim(),
      genres: [],
      status: $('.info-content')
        .text()
        .match(/Status:\s*(\w+)/)?.[1],
    };
  },
  async getEpisodes(sourceId) {
    const $ = load(await sourceText(origin, '/anime/' + slug(sourceId) + '/'));
    const seen = new Set<string>();
    return $('.eplister a')
      .toArray()
      .flatMap((element) => {
        const a = $(element),
          id = sourceSlug(a.attr('href'), false);
        const episodeNumber = Number(
          a
            .find('.epl-num')
            .text()
            .trim()
            .match(/^\d+(?:\.\d+)?/)?.[0],
        );
        if (!id || seen.has(id) || !Number.isFinite(episodeNumber) || episodeNumber <= 0) return [];
        seen.add(id);
        return [
          {
            id,
            providerId,
            mediaId: sourceId,
            episodeNumber,
            title: a.find('.epl-title').text().trim() || `Episode ${episodeNumber}`,
          },
        ];
      })
      .sort((a, b) => a.episodeNumber - b.episodeNumber);
  },
  async getPlaybackSource(sourceId, episodeId) {
    slug(sourceId);
    slug(episodeId);
    const episodes = await donghuaStreamAdapter.getEpisodes!(sourceId);
    if (!episodes.some((episode) => episode.id === episodeId))
      throw new ProviderGatewayError('Episode not listed for this series.', 404);
    const $ = load(await sourceText(origin, '/' + episodeId + '/'));
    let embedId: string | undefined;
    let embedPath = '';
    for (const option of $('select option').toArray()) {
      const embed = load(Buffer.from($(option).attr('value') ?? '', 'base64').toString('utf8'));
      const href = embed('iframe').attr('src');
      if (!href) continue;
      const url = new URL(href, origin);
      if (url.origin === 'https://rumble.com')
        embedId = url.pathname.match(/^\/embed\/(v[a-z0-9]+)\/$/)?.[1];
      if (embedId) {
        embedPath = url.pathname + url.search;
        break;
      }
    }
    if (!embedId)
      throw new ProviderGatewayError(
        'This episode uses a browser-only host; no supported native stream is available.',
        502,
      );
    const data = parseRumbleData(await sourceText('https://rumble.com', embedPath), embedId);
    if (!data.duration || data.duration < 300)
      throw new ProviderGatewayError('Video is too short to verify as a full episode.', 502);
    const variants = data.ua?.tar ?? {};
    const candidate = variants['720'] ?? variants['480'] ?? variants['360'];
    if (!candidate) throw new ProviderGatewayError('No supported video variant.', 502);
    return {
      providerId,
      sourceId,
      mediaId: sourceId,
      episodeId,
      url: mediaUrl(candidate.url),
      qualityOptions: Object.entries(variants).filter(([quality]) => /^(360|480|720|1080)$/.test(quality)).map(([quality, value]) => ({label:quality+'p',url:mediaUrl(value.url)})),
      contentType: 'hls',
      availability: 'available',
      note: 'DonghuaStream public video. Some uploads include burned-in English captions; availability varies by episode.',
    };
  },
};
