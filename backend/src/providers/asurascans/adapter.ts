import { load } from 'cheerio';
import { checkedId, sourceText } from '../shared/sourceHttp.js';
import { ProviderGatewayError, type ContentProviderAdapter } from '../types.js';

const origin = 'https://asurascans.com';
const providerId = 'asurascans';
const slug = (value: string) => checkedId(value, /^[a-z0-9][a-z0-9-]{0,220}$/);
const chapter = (value: string) => checkedId(value, /^\d+(?:\.\d+)?$/);
const bookPath = (value: string) => '/comics/' + slug(value);

/** Parse source-owned chapter links; chapter numbers come from URLs, not row positions. */
async function catalog(sourceId: string) {
  const prefix = bookPath(sourceId) + '/chapter/';
  const $ = load(await sourceText(origin, bookPath(sourceId)));
  const found = new Map<
    string,
    {
      id: string;
      providerId: string;
      mediaId: string;
      title: string;
      chapterNumber: number;
      language: string;
    }
  >();
  $('a[href]').each((_, element) => {
    const url = new URL($(element).attr('href')!, origin);
    if (url.origin !== origin || !url.pathname.startsWith(prefix)) return;
    const id = url.pathname.slice(prefix.length);
    if (!/^\d+(?:\.\d+)?$/.test(id)) return;
    found.set(id, {
      id,
      providerId,
      mediaId: sourceId,
      title: 'Chapter ' + id,
      chapterNumber: Number(id),
      language: 'en',
    });
  });
  if (!found.size) throw new ProviderGatewayError('Asura chapter catalog unavailable.', 502);
  return [...found.values()].sort((a, b) => a.chapterNumber - b.chapterNumber);
}

export const asuraScansAdapter: ContentProviderAdapter = {
  definition: {
    id: providerId,
    name: 'Asura Scans',
    mediaTypes: ['manhwa'],
    capabilities: ['search', 'details', 'chapters', 'pages'],
    status: 'limited',
    enabledByDefault: true,
    statusNote: 'Updated public comics parser; production rollout and device verification pending.',
  },
  async search(query) {
    const $ = load(await sourceText(origin, '/browse?search=' + encodeURIComponent(query)));
    const found = new Map<
      string,
      {
        id: string;
        providerId: string;
        sourceId: string;
        mediaType: 'manhwa';
        title: string;
        coverUrl: string;
      }
    >();
    $('a[href] img[alt]').each((_, img) => {
      const a = $(img).closest('a');
      const url = new URL(a.attr('href') || '/', origin);
      const sourceId =
        url.origin === origin ? url.pathname.match(/^\/comics\/([a-z0-9-]+)$/)?.[1] : undefined;
      const title = $(img).attr('alt')?.trim();
      const cover = $(img).attr('src');
      if (!sourceId || !title || !cover) return;
      found.set(sourceId, {
        id: sourceId,
        sourceId,
        providerId,
        mediaType: 'manhwa',
        title,
        coverUrl: new URL(cover, origin).href,
      });
    });
    return [...found.values()]
      .filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()))
      .slice(0, 20);
  },
  async getDetails(sourceId) {
    const $ = load(await sourceText(origin, bookPath(sourceId)));
    const title = $('h1').first().text().trim();
    if (!title) throw new ProviderGatewayError('Asura title unavailable.', 404);
    return {
      providerId,
      sourceId,
      mediaType: 'manhwa',
      title,
      language: 'en',
      genres: [],
      description: $('meta[name="description"]').attr('content'),
      coverUrl: $('meta[property="og:image"]').attr('content'),
    };
  },
  getChapters: catalog,
  async getPages(sourceId, chapterId) {
    chapter(chapterId);
    if (!(await catalog(sourceId)).some((item) => item.id === chapterId))
      throw new ProviderGatewayError('Chapter is not in this Asura catalog.', 404);
    const $ = load(await sourceText(origin, bookPath(sourceId) + '/chapter/' + chapterId));
    const pages = $('img[data-page-index]')
      .toArray()
      .map((element) => {
        const image = $(element);
        const url = new URL(image.attr('src') || '/', origin);
        const index = Number(image.attr('data-page-index'));
        if (
          url.origin !== 'https://cdn.asurascans.com' ||
          !/^\/asura-images\/chapters(?:-merged)?\//.test(url.pathname) ||
          !Number.isInteger(index) ||
          index < 0
        )
          throw new ProviderGatewayError('Unsupported Asura image.', 502);
        return { pageNumber: index + 1, imageUrl: url.href };
      })
      .sort((a, b) => a.pageNumber - b.pageNumber);
    if (!pages.length || pages.length > 500 || pages.some((p, i) => p.pageNumber !== i + 1))
      throw new ProviderGatewayError('Asura pages unavailable or incomplete.', 502);
    return pages;
  },
};
