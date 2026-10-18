export const browserProviders = [
  { id: 'videasy', label: 'Videasy' },
  { id: 'vidsrc', label: 'VidSrc' },
  { id: 'superembed', label: 'SuperEmbed' },
] as const;
export type BrowserProvider = (typeof browserProviders)[number]['id'];
/** Documented embed URLs, not JSON manifests or native video sources. */
export function browserPlaybackUrl(
  type: string,
  id: string,
  season?: string,
  episode?: string,
  provider: BrowserProvider = 'videasy',
) {
  if (!['movie', 'tv'].includes(type) || !/^[1-9][0-9]{0,19}$/.test(id)) return null;
  if (
    type === 'tv' &&
    (!/^(0|[1-9][0-9]?)$/.test(season || '') || !/^[1-9][0-9]{0,3}$/.test(episode || ''))
  )
    return null;
  const path = type === 'movie' ? `movie/${id}` : `tv/${id}/${season}/${episode}`;
  if (provider === 'videasy') return `https://player.videasy.to/${path}?overlay=true`;
  if (provider === 'vidsrc') return `https://vidsrc.sh/embed/${path}`;
  if (provider === 'superembed')
    return `https://multiembed.mov/?video_id=${id}&tmdb=1${type === 'tv' ? `&s=${season}&e=${episode}` : ''}`;
  return null;
}
