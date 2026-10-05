import { load } from 'cheerio';
import { sourceText } from '../shared/sourceHttp.js';
import { ProviderGatewayError, type ContentProviderAdapter } from '../types.js';
const origin = 'https://wanderinginn.com',
  providerId = 'wanderinginn',
  sourceId = 'the-wandering-inn';
function check(value: string) {
  if (value !== sourceId) throw new ProviderGatewayError('Unknown title.', 404);
}
async function catalog(value: string) {
  check(value);
  const $ = load(await sourceText(origin, '/table-of-contents/'));
  const seen = new Set<string>();
  return $('.chapter-entry .body-web a[href]')
    .toArray()
    .flatMap((e) => {
      const a = $(e),
        u = new URL(a.attr('href')!, origin);
      if (
        u.origin !== origin ||
        !/^\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9-]+\/$/.test(u.pathname) ||
        seen.has(u.pathname)
      )
        return [];
      seen.add(u.pathname);
      return [
        {
          id: u.pathname.slice(1, -1),
          providerId,
          mediaId: sourceId,
          title: a.text().trim(),
          chapterNumber: seen.size,
          language: 'en',
        },
      ];
    });
}
export const wanderingInnAdapter: ContentProviderAdapter = {
  definition: {
    id: providerId,
    name: 'The Wandering Inn',
    mediaTypes: ['novel'],
    capabilities: ['search', 'details', 'chapters', 'textContent'],
    enabledByDefault: true,
    status: 'limited',
    statusNote:
      'Author-hosted public web serial; local text verified. Render/device verification pending.',
  },
  async search(query) {
    if (!/wandering|pirateaba/i.test(query)) return [];
    return [
      {
        id: sourceId,
        sourceId,
        providerId,
        mediaType: 'novel',
        title: 'The Wandering Inn',
        author: 'pirateaba',
      },
    ];
  },
  async getDetails(value) {
    check(value);
    return {
      sourceId,
      providerId,
      mediaType: 'novel',
      title: 'The Wandering Inn',
      author: 'pirateaba',
      language: 'en',
      genres: ['Fantasy', 'LitRPG'],
      description: 'Read the public web serial from its author-hosted chapter catalog.',
    };
  },
  getChapters: catalog,
  async getNovelContent(value, chapterId) {
    const chapters = await catalog(value),
      index = chapters.findIndex((c) => c.id === chapterId);
    if (index < 0) throw new ProviderGatewayError('Chapter is not publicly listed.', 404);
    const $ = load(await sourceText(origin, '/' + chapterId + '/'));
    $('.twi-article script,.twi-article style,.twi-article [hidden]').remove();
    const paragraphs = $('.twi-article p')
      .toArray()
      .map((e) => $(e).text().trim())
      .filter(Boolean);
    if (!paragraphs.length) throw new ProviderGatewayError('Public chapter text unavailable.', 502);
    return {
      providerId,
      mediaId: sourceId,
      chapterId,
      title: chapters[index].title,
      paragraphs,
      language: 'en',
      previousChapterId: chapters[index - 1]?.id,
      nextChapterId: chapters[index + 1]?.id,
    };
  },
};
