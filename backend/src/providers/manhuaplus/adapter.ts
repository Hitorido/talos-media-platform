import { load } from 'cheerio';
import { checkedId, sourceText } from '../shared/sourceHttp.js';
import { ProviderGatewayError, type ContentProviderAdapter } from '../types.js';
const origin = 'https://manhuaplus.org';
const providerId = 'manhuaplus';
const id = (value: string) => checkedId(value, /^[a-z0-9-]+$/);
const absolute = (value?: string) => (value ? new URL(value, origin).href : undefined);
async function catalog(sourceId: string) {
  const $ = load(await sourceText(origin, '/manga/' + id(sourceId)));
  const seen = new Set<string>();
  return $('.chapter a[href]')
    .toArray()
    .flatMap((element) => {
      const a = $(element),
        url = new URL(a.attr('href')!, origin);
      const prefix = '/manga/' + sourceId + '/';
      if (url.origin !== origin || !url.pathname.startsWith(prefix)) return [];
      const chapter = url.pathname.slice(prefix.length);
      if (!/^chapter-[0-9]+(?:-[0-9]+)*$/.test(chapter) || seen.has(chapter)) return [];
      seen.add(chapter);
      return [
        {
          id: chapter,
          providerId,
          mediaId: sourceId,
          title: a.text().trim(),
          chapterNumber: Number(chapter.slice(8).replace('-', '.')),
          language: 'en',
        },
      ];
    })
    .sort((a, b) => a.chapterNumber - b.chapterNumber);
}
export const manhuaPlusAdapter: ContentProviderAdapter = {
  definition: {
    id: providerId,
    name: 'ManhuaPlus',
    mediaTypes: ['manga', 'manhwa', 'manhua'],
    capabilities: ['search', 'details', 'chapters', 'pages'],
    status: 'limited',
    enabledByDefault: true,
    statusNote: 'Public catalog and images verified locally; Render/device verification pending.',
  },
  async search(query) {
    const $ = load(await sourceText(origin, '/search?keyword=' + encodeURIComponent(query)));
    const seen = new Set<string>();
    return $('a[title][href]')
      .toArray()
      .flatMap((e) => {
        const a = $(e),
          url = new URL(a.attr('href')!, origin),
          sourceId =
            url.origin === origin ? url.pathname.match(/^\/manga\/([a-z0-9-]+)$/)?.[1] : undefined;
        if (!sourceId || seen.has(sourceId) || !a.find('img').length) return [];
        seen.add(sourceId);
        return [
          {
            id: sourceId,
            sourceId,
            providerId,
            mediaType: 'manga' as const,
            title: a.attr('title')!,
            coverUrl: absolute(a.find('img').attr('data-src')),
          },
        ];
      })
      .slice(0, 20);
  },
  async getDetails(sourceId) {
    const $ = load(await sourceText(origin, '/manga/' + id(sourceId)));
    const title = $('h1').first().text().trim();
    const genres = $('h1')
      .first()
      .parent()
      .parent()
      .find('a[href*="/genres/"]')
      .toArray()
      .map((e) => $(e).text().trim())
      .filter(Boolean);
    if (!title) throw new ProviderGatewayError('Title unavailable.', 404);
    return {
      sourceId,
      providerId,
      mediaType: genres.includes('Manhua')
        ? 'manhua'
        : genres.includes('Manhwa')
          ? 'manhwa'
          : 'manga',
      title,
      coverUrl: absolute($('meta[property="og:image"]').attr('content')),
      genres,
      language: 'en',
    };
  },
  getChapters: catalog,
  async getPages(sourceId, chapterId) {
    if (!(await catalog(sourceId)).some((c) => c.id === chapterId))
      throw new ProviderGatewayError('Chapter is not in this catalog.', 404);
    const html = await sourceText(origin, '/manga/' + id(sourceId) + '/' + id(chapterId));
    const chapter = html.match(/CHAPTER_ID\s*=\s*(\d+)/)?.[1];
    if (!chapter) throw new ProviderGatewayError('Chapter images unavailable.', 502);
    const payload = JSON.parse(
      await sourceText(origin, '/ajax/image/list/chap/' + chapter, 'POST'),
    );
    if (!payload.status || typeof payload.html !== 'string')
      throw new ProviderGatewayError('Chapter images unavailable.', 502);
    const $ = load(payload.html);
    const rows = $('.separator[data-index]')
      .toArray()
      .map((e) => ({
        index: Number($(e).attr('data-index')),
        url: $(e).find('a.readImg').attr('href') ?? '',
      }))
      .sort((a, b) => a.index - b.index);
    if (!rows.length || rows.length > 500 || new Set(rows.map((r) => r.index)).size !== rows.length)
      throw new ProviderGatewayError('Invalid page list.', 502);
    return rows.map((r, i) => {
      const u = new URL(r.url);
      if (
        u.protocol !== 'https:' ||
        !!u.username ||
        !!u.password ||
        !!u.port ||
        !(
          (u.hostname === 'cdn.manhuaplus.cc' && u.pathname.startsWith('/ch/' + chapter + '/')) ||
          (u.hostname === 'cdn.manhuaplus.org' &&
            /^\/\d{4}\/\d{2}\/\d{2}\/[a-zA-Z0-9-]+\.(?:webp|png|jpe?g)$/.test(u.pathname))
        ) ||
        !Number.isFinite(r.index)
      )
        throw new ProviderGatewayError('Unsupported image host or page.', 502);
      return { pageNumber: i + 1, imageUrl: u.href };
    });
  },
};
