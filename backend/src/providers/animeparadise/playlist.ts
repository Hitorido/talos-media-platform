import { checkedId, sourceText } from '../shared/sourceHttp.js';
import { ProviderGatewayError } from '../types.js';

const api = 'https://api.animeparadise.moe';
const stream = 'https://stream.animeparadise.moe';
const id = (value: string) => checkedId(value, /^[a-zA-Z0-9_-]{1,180}$/);

type Episode = {
  uid: string;
  origin: string;
  streamLink?: string;
  subData?: { src: string; label: string; type: string }[];
};

async function episode(title: string, episodeId: string): Promise<Episode> {
  const anime = JSON.parse(await sourceText(api, '/anime/' + id(title))).data;
  const result = JSON.parse(
    await sourceText(api, '/ep/' + id(episodeId) + '?origin=' + id(anime?._id ?? '')),
  ).data?.episode as Episode | undefined;
  if (!result || result.uid !== episodeId || result.origin !== anime._id) {
    throw new ProviderGatewayError('Episode does not belong to this title.', 404);
  }
  return result;
}

function subtitleUrl(ep: Episode) {
  const sub = ep.subData?.find((track) => track.type === 'vtt' && /^english$/i.test(track.label));
  if (!sub) return null;
  const url = new URL(sub.src);
  if (url.origin !== stream || url.pathname !== '/captions' || url.username || url.password) {
    throw new ProviderGatewayError('Unsupported subtitle origin.', 502);
  }
  return url;
}

function filterByMaxHeight(rawLines: string[], maxHeight: number): string[] {
  const filtered: string[] = [];
  for (let i = 0; i < rawLines.length; i += 1) {
    const line = rawLines[i];
    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      const resolution = Number(line.match(/RESOLUTION=\d+x(\d+)/)?.[1] || 0);
      if (resolution > maxHeight) {
        i += 1;
        continue;
      }
    }
    filtered.push(line);
  }
  return filtered;
}

/** Only source-owned episode metadata chooses URLs. No caller-provided URL or arbitrary relay. */
export async function animeParadisePlaylist(
  title: string,
  episodeId: string,
  kind: string,
): Promise<{ type: string; body: string }> {
  id(title);
  id(episodeId);
  if (!['master.m3u8', 'auto.m3u8', 'low.m3u8', 'english.m3u8', 'english.vtt'].includes(kind)) {
    throw new ProviderGatewayError('Unknown playlist resource.', 404);
  }

  const ep = await episode(title, episodeId);
  const sub = subtitleUrl(ep);

  if (kind === 'english.m3u8' || kind === 'english.vtt') {
    if (!sub) throw new ProviderGatewayError('No English WebVTT track supplied.', 404);
    const vtt = await sourceText(stream, sub.pathname + sub.search);
    if (!vtt.trimStart().startsWith('WEBVTT')) {
      throw new ProviderGatewayError('Subtitle file unavailable.', 502);
    }
    if (kind === 'english.vtt') return { type: 'text/vtt', body: vtt };
    const ends = [...vtt.matchAll(/-->\s*(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})/g)].map(
      (m) => Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000,
    );
    const duration = Math.max(0, ...ends);
    if (!duration || duration > 21600) {
      throw new ProviderGatewayError('Invalid subtitle timing.', 502);
    }
    return {
      type: 'application/vnd.apple.mpegurl',
      body: `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:${Math.ceil(duration)}\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-PLAYLIST-TYPE:VOD\n#EXTINF:${duration.toFixed(3)},\nenglish.vtt\n#EXT-X-ENDLIST\n`,
    };
  }

  if (!ep.streamLink) throw new ProviderGatewayError('Stream unavailable.', 502);
  const path = '/m3u8?url=' + encodeURIComponent(ep.streamLink);
  const base = stream + path;
  const master = await sourceText(stream, path);
  if (!master.startsWith('#EXTM3U') || !master.includes('#EXT-X-STREAM-INF:')) {
    throw new ProviderGatewayError('Unsupported stream playlist.', 502);
  }

  const absolute = (raw: string) => {
    const url = new URL(raw, base);
    if (url.origin !== stream || url.username || url.password) {
      throw new ProviderGatewayError('Unsupported stream origin.', 502);
    }
    return url.href;
  };

  const rawLines = master.split(/\r?\n/).filter(Boolean);
  const limit = kind === 'auto.m3u8' ? Infinity : kind === 'low.m3u8' ? 480 : 720;
  let filtered = filterByMaxHeight(rawLines, limit);
  // If the source only exposes higher resolutions (e.g. 1080p-only), keep the full master.
  if (!filtered.some((line) => line.startsWith('#EXT-X-STREAM-INF:'))) {
    filtered = rawLines.slice();
  }
  // If still no streams after fallback, the episode genuinely has no playable streams
  if (!filtered.some((line) => line.startsWith('#EXT-X-STREAM-INF:'))) {
    throw new ProviderGatewayError('No playable streams available for this episode.', 502);
  }

  const lines = filtered
    .join('\n')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        return line.replace(/,SUBTITLES="[^"]*"/g, '') + (sub ? ',SUBTITLES="english"' : '');
      }
      if (line.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/g, (_, uri) => 'URI="' + absolute(uri) + '"');
      }
      return absolute(line);
    });

  if (sub) {
    lines.splice(
      1,
      0,
      '#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="english",NAME="English",LANGUAGE="en",AUTOSELECT=YES,DEFAULT=YES,FORCED=NO,URI="english.m3u8"',
    );
  }

  return { type: 'application/vnd.apple.mpegurl', body: lines.join('\n') + '\n' };
}
