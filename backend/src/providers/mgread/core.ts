import { load } from 'cheerio/slim';
import { checkedId, type SourceText } from '../shared/sourceValidation.ts';
import { ProviderGatewayError, type ContentProviderAdapter } from '../types.ts';
const origin = 'https://mgread.io',
  providerId = 'mgread';
const id = (value: string) => checkedId(value, /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/);
export function createMgreadAdapter(sourceText: SourceText): ContentProviderAdapter {
  async function detail(sourceId: string) {
    return load(await sourceText(origin, '/manga/' + id(sourceId)));
  }
  const adapter: ContentProviderAdapter = {
    definition: {
      id: providerId,
      name: 'Mgread',
      mediaTypes: ['manga', 'manhwa'],
      capabilities: ['search', 'details', 'chapters', 'pages'],
      status: 'limited',
      statusNote: 'Verified locally. Upstream may require Cloudflare bypass on Render.',
      enabledByDefault: true,
    },
    async search(query) {
      const $ = load(await sourceText(origin, '/?s=' + encodeURIComponent(query)));
      return $('.manga-post')
        .toArray()
        .flatMap((el) => {
          const a = $(el).find('a').first();
          const href = a.attr('href');
          if (!href) return [];
          const sourceId = href.replace('/manga/', '').replace('/', '');
          if (!/^[A-Za-z0-9-]+$/.test(sourceId)) return [];
          const title = a.find('.post-title').text().trim();
          const coverUrl = a.find('img').attr('src');
          return title
            ? [
                {
                  id: sourceId,
                  sourceId,
                  providerId,
                  mediaType: 'manga' as const,
                  title,
                  coverUrl,
                },
              ]
            : [];
        })
        .slice(0, 20);
    },
    async getDetails(sourceId) {
      const $ = await detail(sourceId);
      const title = $('.post-title h1').first().text().trim();
      if (!title) throw new ProviderGatewayError('Source details unavailable.', 502);
      return {
        providerId,
        sourceId,
        mediaType: 'manga',
        title,
        coverUrl: $('.summary_image img').attr('src'),
        description: $('.summary__content p').first().text().trim(),
        genres: $('.genres-content a')
          .toArray()
          .map((el) => $(el).text().trim()),
      };
    },
    async getChapters(sourceId) {
      const $ = await detail(sourceId);
      const chapters = new Map<
        string,
        { id: string; providerId: string; mediaId: string; chapterNumber: number; title: string }
      >();
      $('.wp-manga-chapter a').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        const match = href.match(/chapter-(\d+(?:\.\d+)?)/);
        if (!match) return;
        const chapterId = match[1];
        chapters.set(chapterId, {
          id: chapterId,
          providerId,
          mediaId: sourceId,
          chapterNumber: Number(chapterId),
          title: $(el).text().trim(),
        });
      });
      if (!chapters.size) throw new ProviderGatewayError('Chapter list unavailable.', 502);
      return [...chapters.values()].sort((a, b) => a.chapterNumber - b.chapterNumber);
    },
    async getPages(sourceId, chapterId) {
      checkedId(chapterId, /^[0-9]+(?:\.[0-9]+)?$/);
      const $ = await detail(sourceId);
      const chapterLink = $(`.wp-manga-chapter a:contains("${chapterId}")`).first();
      const href = chapterLink.attr('href');
      if (!href) throw new ProviderGatewayError('Chapter link not found.', 404);
      const $chapter = load(await sourceText(origin, href.replace(origin, '')));
      const pages = $chapter('.reading-content img')
        .toArray()
        .map((el) => {
          const url = $(el).attr('data-src') || $(el).attr('src');
          if (!url) return null;
          return { pageNumber: 0, imageUrl: url.startsWith('http') ? url : origin + url };
        })
        .filter((p): p is { pageNumber: number; imageUrl: string } => p !== null)
        .map((p, i) => ({ ...p, pageNumber: i + 1 }));
      if (!pages.length) throw new ProviderGatewayError('Chapter images unavailable.', 502);
      return pages;
    },
  };
  return adapter;
}
