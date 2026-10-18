import { isIP } from 'node:net';
import { ProviderGatewayError } from './types.js';

export interface CineProStream {
  url: string;
  quality: string;
  contentType: 'hls' | 'progressive';
  headers?: Record<string, string>;
  providerName: string;
}
export interface CineProSubtitle {
  url: string;
  language: string;
  label: string;
  format: string;
  headers?: Record<string, string>;
}
export interface CineProPlaybackPayload {
  providerId: string;
  sourceId: string;
  streams: CineProStream[];
  subtitles: CineProSubtitle[];
}
const fail = (message: string, status: number, code: string): never => {
  throw new ProviderGatewayError(message, status, code);
};
export function playbackParameters(
  type: unknown,
  id: unknown,
  season?: unknown,
  episode?: unknown,
) {
  if (
    (type !== 'movie' && type !== 'tv') ||
    typeof id !== 'string' ||
    !/^[1-9][0-9]{0,19}$/.test(id)
  )
    return fail('Invalid media type or TMDB ID.', 400, 'MALFORMED_STREAM_PARAMETERS');
  if (type === 'movie') {
    if (season !== undefined || episode !== undefined)
      return fail(
        'Movies do not have season/episode parameters.',
        400,
        'MALFORMED_STREAM_PARAMETERS',
      );
    return { type: 'movie' as const, id, season: undefined, episode: undefined };
  }
  if (
    typeof season !== 'string' ||
    !/^(0|[1-9][0-9]?)$/.test(season) ||
    typeof episode !== 'string' ||
    !/^[1-9][0-9]{0,3}$/.test(episode)
  )
    return fail('Choose a season (0?99) and episode (1?9999).', 400, 'MALFORMED_STREAM_PARAMETERS');
  return { type: 'tv' as const, id, season: Number(season), episode: Number(episode) };
}
/** Decode only the documented OMSS proxy envelope; media travels directly to the player. */
function mediaTarget(value: unknown, base: URL, supplied?: unknown) {
  if (typeof value !== 'string' || value.length > 20000) throw new Error('Invalid media URL');
  let url = new URL(value, base);
  let headers = supplied;
  if (url.origin === base.origin && /^\/v1\/proxy\/?$/.test(url.pathname)) {
    // Public CinePro delivery keeps its upstream headers and nested HLS rewriting intact.
    // Never expose private hosts or server authorization in the mobile source.
    if (
      base.protocol === 'https:' &&
      !process.env.CINEPRO_AUTHORIZATION &&
      !isIP(base.hostname.replace(/^\[|\]$/g, '')) &&
      base.hostname.includes('.') &&
      !/(^|\.)(localhost|local|internal|test)$/.test(base.hostname)
    ) {
      return { url: url.href };
    }
    const data = JSON.parse(url.searchParams.get('data') || '{}');
    url = new URL(data.url);
    headers = data.headers;
  }
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.origin === base.origin ||
    isIP(host.replace(/^\[|\]$/g, '')) ||
    !host.includes('.') ||
    /(^|\.)(localhost|local|internal|test)$/.test(host)
  )
    throw new Error('Non-public media URL');
  const safe: Record<string, string> = {};
  if (headers && typeof headers === 'object') {
    for (const [key, val] of Object.entries(headers)) {
      if (
        /^(referer|origin|user-agent|accept)$/i.test(key) &&
        typeof val === 'string' &&
        val.length <= 2048 &&
        !/[\r\n]/.test(val)
      )
        safe[key] = val;
    }
  }
  return { url: url.href, ...(Object.keys(safe).length ? { headers: safe } : {}) };
}
export class CineProAdapter {
  async extractPlayback(
    tmdbId: string,
    type: 'movie' | 'tv',
    season?: number,
    episode?: number,
  ): Promise<CineProPlaybackPayload> {
    playbackParameters(
      type,
      tmdbId,
      season === undefined ? undefined : String(season),
      episode === undefined ? undefined : String(episode),
    );
    const configured = process.env.CINEPRO_EXTRACTOR_URL;
    if (!configured)
      return fail('Movie/TV playback is not configured.', 503, 'PROVIDER_NOT_CONFIGURED');
    let base: URL;
    try {
      base = new URL(configured);
      if (
        !['http:', 'https:'].includes(base.protocol) ||
        base.username ||
        base.password ||
        base.pathname !== '/' ||
        base.search ||
        base.hash
      )
        throw new Error();
    } catch {
      return fail('Invalid extractor configuration.', 503, 'PROVIDER_NOT_CONFIGURED');
    }
    const path =
      type === 'movie'
        ? `/v1/movies/${tmdbId}`
        : `/v1/tv/${tmdbId}/seasons/${season}/episodes/${episode}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(new URL(path, base), {
        signal: controller.signal,
        redirect: 'error',
        headers: {
          Accept: 'application/json',
          ...(process.env.CINEPRO_AUTHORIZATION
            ? { Authorization: process.env.CINEPRO_AUTHORIZATION }
            : {}),
        },
      });
      if (!response.ok)
        return fail(
          `Playback service returned HTTP ${response.status}.`,
          response.status,
          response.status === 403
            ? 'UPSTREAM_BLOCKED'
            : response.status === 504
              ? 'TIMEOUT'
              : 'PLAYBACK_EXTRACTION_FAILED',
        );
      const reader = response.body?.getReader();
      if (!reader) return fail('Empty playback response.', 502, 'INVALID_PLAYBACK_RESPONSE');
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > 2000000) {
          await reader.cancel();
          return fail('Playback response too large.', 502, 'INVALID_PLAYBACK_RESPONSE');
        }
        chunks.push(part.value);
      }
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!Array.isArray(data.sources))
        return fail('Invalid playback response.', 502, 'INVALID_PLAYBACK_RESPONSE');
      const streams: CineProStream[] = data.sources
        .slice(0, 100)
        .flatMap((s: Record<string, unknown>) => {
          try {
            if (!['hls', 'mp4', 'http'].includes(String(s.type))) return [];
            return [
              {
                ...mediaTarget(s.url, base, s.headers),
                quality: typeof s.quality === 'string' ? s.quality.slice(0, 30) : 'auto',
                contentType: s.type === 'hls' ? ('hls' as const) : ('progressive' as const),
                providerName:
                  typeof (s.provider as { name?: unknown })?.name === 'string'
                    ? String((s.provider as { name: string }).name).slice(0, 80)
                    : 'CinePro',
              },
            ];
          } catch {
            return [];
          }
        });
      if (!streams.length)
        return fail('No supported playable sources were returned.', 404, 'NO_SOURCES_AVAILABLE');
      const subtitles: CineProSubtitle[] = (Array.isArray(data.subtitles) ? data.subtitles : [])
        .slice(0, 100)
        .flatMap((s: Record<string, unknown>) => {
          try {
            if (!['vtt', 'srt'].includes(String(s.format))) return [];
            return [
              {
                ...mediaTarget(s.url, base, s.headers),
                format: String(s.format),
                label: typeof s.label === 'string' ? s.label.slice(0, 80) : 'Subtitles',
                language: typeof s.language === 'string' ? s.language.slice(0, 30) : '',
              },
            ];
          } catch {
            return [];
          }
        });
      return { providerId: 'cinepro_cloud_hosted', sourceId: tmdbId, streams, subtitles };
    } catch (error) {
      if (error instanceof ProviderGatewayError) throw error;
      if (controller.signal.aborted)
        return fail('Playback resolution timed out. Try again.', 504, 'TIMEOUT');
      const e = error as { code?: string; cause?: { code?: string } };
      const code = e.cause?.code || e.code;
      if (code === 'ENOTFOUND' || code === 'EAI_AGAIN')
        return fail('Playback service DNS lookup failed.', 503, 'DNS_FAILURE');
      if (code === 'ECONNREFUSED' || code === 'ECONNRESET')
        return fail('Playback service is unavailable.', 503, 'SERVICE_UNAVAILABLE');
      if (code === 'UND_ERR_CONNECT_TIMEOUT')
        return fail('Playback connection timed out.', 504, 'TIMEOUT');
      return fail(
        'Playback service returned an invalid response or could not be reached.',
        502,
        'PLAYBACK_EXTRACTION_FAILED',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
export const cineproAdapter = new CineProAdapter();
