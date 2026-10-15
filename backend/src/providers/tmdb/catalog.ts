import type { Request, Response } from 'express';
import { ProviderGatewayError } from '../types.js';
type Entry = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  overview?: string;
  adult?: boolean;
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
  const hit = cache.get(kind);
  if (hit && hit.until > Date.now()) {
    res.json({ data: { items: hit.items } });
    return;
  }
  const type = kind === 'movies' ? 'movie' : 'tv';
  const response = await fetch(
    `https://api.themoviedb.org/3/trending/${type}/week?language=en-US`,
    { signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok)
    throw new ProviderGatewayError(`Catalog HTTP ${response.status}.`, response.status);
  const json = (await response.json()) as { results: Entry[] };
  const items = json.results
    .filter((x) => !x.adult)
    .slice(0, 20)
    .map((x) => ({
      id: String(x.id),
      title: x.title || x.name || 'Untitled',
      overview: x.overview || '',
      coverUrl: x.poster_path ? 'https://image.tmdb.org/t/p/w342' + x.poster_path : '',
      website: `https://www.themoviedb.org/${type}/${x.id}`,
    }));
  cache.set(kind, { until: Date.now() + 300000, items });
  res.json({ data: { items } });
}
