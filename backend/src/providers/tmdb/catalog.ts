import type { Request, Response } from 'express';
import { ProviderGatewayError } from '../types.js';
type Entry = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  overview?: string;
  adult?: boolean;
  genre_ids?: number[];
};
const cache = new Map<string, { until: number; items: unknown[] }>();
/** Metadata only: this route never resolves or advertises a video stream. */
export async function tmdbCatalog(req: Request, res: Response) {
  const kind = req.params.kind;
  if (kind !== 'movies' && kind !== 'tv') throw new ProviderGatewayError('Unknown catalog.', 400);
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token)
    throw new ProviderGatewayError(
      'Movie and TV catalog is not configured yet.',
      503,
      'PROVIDER_NOT_CONFIGURED',
    );
  const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 120) : '';
  const feed = req.query.feed || 'trending';
  if (!['trending', 'popular', 'top_rated'].includes(String(feed)))
    throw new ProviderGatewayError('Invalid feed.', 400);
  const key = `${kind}:${feed}:${query}`;
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) {
    res.json({ data: { items: hit.items } });
    return;
  }
  const type = kind === 'movies' ? 'movie' : 'tv';
  const response = await fetch(
    `https://api.themoviedb.org/3/${query ? `search/${type}?query=${encodeURIComponent(query)}&include_adult=false` : feed === 'trending' ? `trending/${type}/week?` : `${type}/${feed}?`}&language=en-US`,
    { signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok)
    throw new ProviderGatewayError(`Catalog HTTP ${response.status}.`, response.status);
  const json = (await response.json()) as { results: Entry[] };
  const genreResponse = await fetch(
    `https://api.themoviedb.org/3/genre/${type}/list?language=en-US`,
    { signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${token}` } },
  );
  const genreData = genreResponse.ok
    ? ((await genreResponse.json()) as { genres: { id: number; name: string }[] })
    : { genres: [] };
  const genres = new Map(genreData.genres.map((g) => [g.id, g.name]));
  const items = json.results
    .filter((x) => !x.adult)
    .slice(0, 20)
    .map((x) => ({
      id: String(x.id),
      genres: (x.genre_ids || []).flatMap((id) => (genres.has(id) ? [genres.get(id)!] : [])),
      title: x.title || x.name || 'Untitled',
      overview: x.overview || '',
      coverUrl: x.poster_path ? 'https://image.tmdb.org/t/p/w342' + x.poster_path : '',
      website: `https://www.themoviedb.org/${type}/${x.id}`,
    }));
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  cache.set(key, { until: Date.now() + 300000, items });
  res.json({ data: { items } });
}
