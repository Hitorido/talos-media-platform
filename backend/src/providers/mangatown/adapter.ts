import { load } from 'cheerio';
import { checkedId, sourceText } from '../shared/sourceHttp.js';
import { ProviderGatewayError, type ContentProviderAdapter } from '../types.js';

const origin = 'https://www.mangatown.com';
const providerId = 'mangatown';
const mediaId = (value: string) => checkedId(value, /^[a-z0-9]+(?:_[a-z0-9]+)*$/);
const chapterId = (value: string) => checkedId(value, /^c[0-9]+(?:[.][0-9]+)?$/);
const imagePath = (sourceId: string, chapter?: string, page?: number) =>
  '/api/content/mangatown/image?mediaId=' + encodeURIComponent(sourceId) +
  (chapter ? '&chapterId=' + encodeURIComponent(chapter) + '&page=' + page : '');

async function chapterDocument(sourceId: string, chapter: string) {
  const prefix = '/manga/' + mediaId(sourceId) + '/' + chapterId(chapter) + '/';
  const $ = load(await sourceText(origin, prefix));
  const paths = new Map<number, string>([[1, prefix]]);
  $('select option').each((_, el) => {
    const path = $(el).attr('value') || '';
    if (!path.startsWith(prefix)) return;
    const match = path.slice(prefix.length).match(/^([0-9]+)[.]html$/);
    if (match) paths.set(Number(match[1]), path);
  });
  if (!$('#image').attr('src') || paths.size > 300 || [...paths.keys()].some(n => n < 1 || n > 300)) {
    throw new ProviderGatewayError('Chapter page list unavailable or exceeds supported size.', 502);
  }
  const ordered = [...paths.keys()].sort((a, b) => a - b);
  if (ordered.some((page, index) => page !== index + 1)) throw new ProviderGatewayError('Incomplete chapter pagination.', 502);
  return { $, paths, ordered };
}

/** Resolve only source-owned identifiers; callers never supply an upstream URL. */
export async function mangaTownImageUrl(sourceId: string, chapter?: string, page?: number): Promise<string> {
  let raw: string | undefined;
  if (!chapter) {
    const $ = load(await sourceText(origin, '/manga/' + mediaId(sourceId) + '/'));
    raw = $('.detail_info > img').first().attr('src');
  } else {
    const document = await chapterDocument(sourceId, chapter);
    const path = document.paths.get(page!);
    if (!path) throw new ProviderGatewayError('Page is not listed for this chapter.', 404);
    const $ = page === 1 ? document.$ : load(await sourceText(origin, path));
    raw = $('#image').attr('src');
  }
  if (!raw) throw new ProviderGatewayError('Source image unavailable.', 502);
  const url = new URL(raw, origin);
  const cover = url.origin === 'https://fmcdn.mangahere.com' && /^\/store\/manga\/[0-9]+\/ocover[.]jpg$/.test(url.pathname);
  const content = url.origin === 'https://zjcdn.mangahere.org' && /^\/store\/manga\/[0-9]+\/[0-9.]+\/compressed\/[A-Za-z0-9_-]+[.](?:jpg|jpeg|png|webp)$/.test(url.pathname);
  if (url.username || url.password || (chapter ? !content : !cover)) throw new ProviderGatewayError('Unexpected MangaTown image location.', 502);
  return url.href;
}

export const mangaTownAdapter: ContentProviderAdapter = {
  definition: { id: providerId, name: 'MangaTown', mediaTypes: ['manga'], capabilities: ['search', 'details', 'chapters', 'pages'], status: 'limited', statusNote: 'Local reader/image flow verified; Render verification pending connectivity. Physical reader unverified. Generic comic classification.', enabledByDefault: true },
  async search(query) {
    const $ = load(await sourceText(origin, '/search?name=' + encodeURIComponent(query)));
    return $('.title a').toArray().flatMap(el => {
      const a = $(el), sourceId = a.attr('href')?.match(/^\/manga\/([a-z0-9_]+)\/$/)?.[1];
      if (!sourceId) return [];
      return [{ id: sourceId, sourceId, providerId, mediaType: 'manga' as const, title: a.attr('title') || a.text().trim(), coverUrl: imagePath(sourceId) }];
    }).slice(0, 20);
  },
  async getDetails(sourceId) {
    const $ = load(await sourceText(origin, '/manga/' + mediaId(sourceId) + '/'));
    const title = $('h1').first().text().trim();
    if (!title) throw new ProviderGatewayError('MangaTown details unavailable.', 502);
    return { providerId, sourceId, mediaType: 'manga', title, coverUrl: imagePath(sourceId), description: $('#show').text().trim(), genres: [] };
  },
  async getChapters(sourceId) {
    const prefix = '/manga/' + mediaId(sourceId) + '/';
    const $ = load(await sourceText(origin, prefix));
    const chapters = new Map<string, { id: string; providerId: string; mediaId: string; chapterNumber: number; title: string }>();
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')!;
      if (!href.startsWith(prefix)) return;
      const id = href.slice(prefix.length).match(/^(c[0-9]+(?:[.][0-9]+)?)\/?$/)?.[1];
      if (id) chapters.set(id, { id, providerId, mediaId: sourceId, chapterNumber: Number(id.slice(1)), title: 'Chapter ' + Number(id.slice(1)) });
    });
    if (!chapters.size) throw new ProviderGatewayError('Chapter list unavailable.', 502);
    return [...chapters.values()].sort((a, b) => a.chapterNumber - b.chapterNumber);
  },
  async getPages(sourceId, chapter) {
    const { ordered } = await chapterDocument(sourceId, chapter);
    return ordered.map(pageNumber => ({ pageNumber, imageUrl: imagePath(sourceId, chapter, pageNumber) }));
  },
};
