import type { Request, Response } from 'express';
import { ProviderGatewayError, type ContentProviderAdapter } from '../types.js';
const providerId = 'suwayomi';
const integer = (v: string) => {
  if (!/^[1-9][0-9]{0,8}$/.test(v)) throw new ProviderGatewayError('Invalid Suwayomi ID.', 400);
  return Number(v);
};
function config() {
  const base = process.env.SUWAYOMI_URL;
  const sources = (process.env.SUWAYOMI_SOURCE_IDS || '')
    .split(',')
    .map((v) => v.trim())
    .filter((v) => /^-?[0-9]{1,20}$/.test(v))
    .slice(0, 3);
  if (!base || !sources.length)
    throw new ProviderGatewayError(
      'Configure the private Suwayomi service and source IDs first.',
      503,
      'PROVIDER_NOT_CONFIGURED',
    );
  const url = new URL(base);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new ProviderGatewayError('Invalid Suwayomi configuration.', 503);
  return { origin: url.origin, sources };
}
async function request(path: string, init: RequestInit = {}) {
  const { origin } = config();
  const url = new URL(path, origin);
  if (url.origin !== origin) throw new ProviderGatewayError('Unexpected Suwayomi path.', 400);
  return fetch(url, {
    ...init,
    redirect: 'error',
    signal: AbortSignal.timeout(20000),
    headers: {
      ...init.headers,
      ...(process.env.SUWAYOMI_AUTHORIZATION
        ? { Authorization: process.env.SUWAYOMI_AUTHORIZATION }
        : {}),
    },
  });
}
async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await request('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok)
    throw new ProviderGatewayError(`Suwayomi HTTP ${response.status}.`, response.status);
  const text = await response.text();
  if (text.length > 5000000) throw new ProviderGatewayError('Suwayomi response too large.', 502);
  const result = JSON.parse(text) as { data?: T; errors?: unknown[] };
  if (result.errors?.length || !result.data)
    throw new ProviderGatewayError(
      'Suwayomi could not complete this request. Check service permissions and extension status.',
      502,
      'SOURCE_UNAVAILABLE',
    );
  return result.data;
}
type Manga = {
  id: number;
  sourceId: string;
  title: string;
  description?: string;
  genre: string[];
  author?: string;
  status?: string;
};
type Chapter = { id: number; mangaId: number; name: string; chapterNumber: number };
const fields = 'id sourceId title description genre author status';
const image = (path: string) => '/api/content/suwayomi/image?path=' + encodeURIComponent(path);
const ownership = new Map<string, number>();
async function checkSource(sourceId: string) {
  integer(sourceId);
  if ((ownership.get(sourceId) ?? 0) > Date.now()) return;
  const result = await gql<{ manga: { sourceId: string } }>(
    'query($id: Int!) { manga(id: $id) { sourceId } }',
    { id: integer(sourceId) },
  );
  if (!config().sources.includes(String(result.manga.sourceId)))
    throw new ProviderGatewayError('This source is not enabled for Talos.', 403);
  if (ownership.size >= 500) ownership.delete(ownership.keys().next().value!);
  ownership.set(sourceId, Date.now() + 300000);
}
async function details(sourceId: string, chapters = false) {
  await checkSource(sourceId);
  const result = await gql<{ fetchMangaAndChapters: { manga: Manga; chapters: Chapter[] } }>(
    `mutation($input: FetchMangaAndChaptersInput!) { fetchMangaAndChapters(input: $input) { manga { ${fields} } chapters { id mangaId name chapterNumber } } }`,
    { input: { id: integer(sourceId), fetchManga: true, fetchChapters: chapters } },
  );
  const data = result.fetchMangaAndChapters;
  if (!config().sources.includes(String(data.manga.sourceId)))
    throw new ProviderGatewayError('This Suwayomi source is not enabled for Talos.', 403);
  return data;
}
export const suwayomiAdapter: ContentProviderAdapter = {
  definition: {
    id: providerId,
    name: 'Suwayomi',
    mediaTypes: ['manga'],
    capabilities: ['search', 'details', 'chapters', 'pages'],
    status: 'requires-configuration',
    statusNote:
      'Private Keiyoushi-compatible service required. Configure and verify installed extensions before use.',
    enabledByDefault: true,
  },
  async search(query) {
    const results = await Promise.allSettled(
      config().sources.map((source) =>
        gql<{ fetchSourceManga: { mangas: Manga[] } }>(
          `mutation($input: FetchSourceMangaInput!) { fetchSourceManga(input: $input) { mangas { ${fields} } } }`,
          { input: { source, type: 'SEARCH', page: 1, query } },
        ),
      ),
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled');
    if (!succeeded.length) throw (results[0] as PromiseRejectedResult).reason;
    return succeeded
      .flatMap((r) => r.value.fetchSourceManga.mangas)
      .filter((m) => config().sources.includes(String(m.sourceId)))
      .slice(0, 20)
      .map((m) => ({
        id: String(m.id),
        sourceId: String(m.id),
        providerId,
        mediaType: 'manga' as const,
        title: m.title,
        coverUrl: image(`/api/v1/manga/${m.id}/thumbnail`),
      }));
  },
  async getDetails(sourceId) {
    const { manga: m } = await details(sourceId);
    return {
      providerId,
      sourceId,
      mediaType: 'manga',
      title: m.title,
      description: m.description,
      author: m.author,
      genres: m.genre,
      status: m.status?.toLowerCase(),
      coverUrl: image(`/api/v1/manga/${m.id}/thumbnail`),
    };
  },
  async getChapters(sourceId) {
    const data = await details(sourceId, true);
    return data.chapters
      .filter((c) => c.mangaId === data.manga.id)
      .sort((a, b) => a.chapterNumber - b.chapterNumber)
      .map((c) => ({
        id: String(c.id),
        providerId,
        mediaId: sourceId,
        title: c.name,
        chapterNumber: c.chapterNumber,
      }));
  },
  async getPages(sourceId, chapterId) {
    const chapters = await suwayomiAdapter.getChapters!(sourceId);
    if (!chapters.some((c) => c.id === chapterId))
      throw new ProviderGatewayError('Chapter does not belong to this title.', 404);
    const result = await gql<{ fetchChapterPages: { pages: string[] } }>(
      'mutation($input: FetchChapterPagesInput!) { fetchChapterPages(input: $input) { pages } }',
      { input: { chapterId: integer(chapterId) } },
    );
    return result.fetchChapterPages.pages.map((path, index) => {
      if (
        !new RegExp('^/api/v1/manga/' + integer(sourceId) + '/chapter/[0-9]+/page/[0-9]+$').test(
          path,
        )
      )
        throw new ProviderGatewayError('Unexpected Suwayomi page path.', 502);
      return { pageNumber: index + 1, imageUrl: image(path) };
    });
  },
};
/** Only manga thumbnails and page images are exposed, never arbitrary service routes. */
export async function suwayomiImage(req: Request, res: Response) {
  const path = typeof req.query.path === 'string' ? req.query.path : '';
  const match = path.match(
    /^\/api\/v1\/manga\/([1-9][0-9]{0,8})\/(?:thumbnail|chapter\/[0-9]+\/page\/[0-9]+)$/,
  );
  if (!match || Object.keys(req.query).length !== 1)
    throw new ProviderGatewayError('Invalid image path.', 400);
  await checkSource(match[1]);
  const response = await request(path);
  if (!response.ok)
    throw new ProviderGatewayError(`Suwayomi image HTTP ${response.status}.`, response.status);
  const type = response.headers.get('content-type') || '';
  if (!/^image\/(jpeg|png|webp|gif|avif)(?:;|$)/i.test(type))
    throw new ProviderGatewayError('Unexpected image format.', 502);
  if (Number(response.headers.get('content-length')) > 20000000)
    throw new ProviderGatewayError('Image too large.', 502);
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length > 20000000) throw new ProviderGatewayError('Image too large.', 502);
  res.setHeader('Content-Type', type);
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.send(data);
}
