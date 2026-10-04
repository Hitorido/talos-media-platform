import { load } from 'cheerio';
import { checkedId, sourceText } from '../shared/sourceHttp.js';
import { ProviderGatewayError, type ContentProviderAdapter } from '../types.js';

const origin = 'https://www.royalroad.com';
const providerId = 'royalroad';
const bookId = (value: string) => checkedId(value, /^\d+\/[a-z0-9-]+$/);
const chapterId = (value: string) => checkedId(value, /^\d+\/[a-z0-9-]+$/);

/** Parse the full public catalog, preserving interludes and nonnumeric chapter titles. */
async function catalog(sourceId: string) {
  const $ = load(await sourceText(origin, '/fiction/' + bookId(sourceId)));
  const seen = new Set<string>();
  return $('#chapters tbody tr')
    .toArray()
    .flatMap((row) => {
      const a = $(row).find('a[href*="/chapter/"]').first();
      const url = new URL(a.attr('href') ?? '/', origin);
      const prefix = '/fiction/' + sourceId + '/chapter/';
      if (url.origin !== origin || !url.pathname.startsWith(prefix)) return [];
      const id = url.pathname.slice(prefix.length);
      if (!/^\d+\/[a-z0-9-]+$/.test(id) || seen.has(id)) return [];
      seen.add(id);
      return [
        {
          id,
          providerId,
          mediaId: sourceId,
          chapterNumber: seen.size,
          title: a.text().trim(),
          language: 'en',
        },
      ];
    });
}

export const royalRoadAdapter: ContentProviderAdapter = {
  definition: {
    id: providerId,
    name: 'Royal Road',
    mediaTypes: ['novel'],
    capabilities: ['search', 'details', 'chapters', 'textContent'],
    status: 'limited',
    enabledByDefault: true,
    statusNote:
      'Public English fiction only; local verification in progress. Removed/stubbed chapters are not retrieved.',
  },
  async search(query) {
    const $ = load(await sourceText(origin, '/fictions/search?title=' + encodeURIComponent(query)));
    return $('.fiction-list-item')
      .toArray()
      .flatMap((element) => {
        const row = $(element),
          a = row.find('.fiction-title a').first();
        const url = new URL(a.attr('href') ?? '/', origin);
        const sourceId =
          url.origin === origin
            ? url.pathname.match(/^\/fiction\/(\d+\/[a-z0-9-]+)$/)?.[1]
            : undefined;
        if (!sourceId) return [];
        const chapterCount =
          Number(
            row
              .text()
              .match(/([\d,]+)\s+Chapters/i)?.[1]
              ?.replace(/,/g, ''),
          ) || undefined;
        return [
          {
            id: sourceId,
            providerId,
            sourceId,
            mediaType: 'novel' as const,
            title: a.text().trim(),
            coverUrl: row.find('img').first().attr('src'),
            chapterCount,
          },
        ];
      })
      .slice(0, 20);
  },
  async getDetails(sourceId) {
    const $ = load(await sourceText(origin, '/fiction/' + bookId(sourceId)));
    const title = $('h1').first().text().trim();
    if (!title) throw new ProviderGatewayError('Royal Road fiction unavailable.', 404);
    return {
      providerId,
      sourceId,
      mediaType: 'novel',
      title,
      language: 'en',
      genres: [],
      description: $('.description').first().text().trim(),
      coverUrl: $('meta[property="og:image"]').attr('content'),
      status: $('.fiction-info .label')
        .toArray()
        .map((e) => $(e).text().trim())
        .find((t) => /^(COMPLETED|ONGOING|HIATUS|DROPPED)$/i.test(t)),
    };
  },
  getChapters: catalog,
  async getNovelContent(sourceId, selectedId) {
    bookId(sourceId);
    chapterId(selectedId);
    const chapters = await catalog(sourceId),
      index = chapters.findIndex((chapter) => chapter.id === selectedId);
    if (index < 0) throw new ProviderGatewayError('Chapter is not in the public catalog.', 404);
    const $ = load(await sourceText(origin, '/fiction/' + sourceId + '/chapter/' + selectedId));
    $(
      '.chapter-content script, .chapter-content style, .chapter-content [hidden], .chapter-content [style*="display:none"], .chapter-content [style*="display: none"]',
    ).remove();
    const paragraphs = $('.chapter-content p')
      .toArray()
      .map((e) => $(e).text().trim())
      .filter(Boolean);
    if (!paragraphs.length) throw new ProviderGatewayError('Public chapter text unavailable.', 502);
    return {
      providerId,
      mediaId: sourceId,
      chapterId: selectedId,
      title: chapters[index].title,
      paragraphs,
      language: 'en',
      previousChapterId: chapters[index - 1]?.id,
      nextChapterId: chapters[index + 1]?.id,
    };
  },
};
