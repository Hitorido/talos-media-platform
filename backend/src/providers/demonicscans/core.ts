import { load } from 'cheerio/slim';
import { checkedId, type SourceText } from '../shared/sourceValidation.ts';
import { ProviderGatewayError, type ContentProviderAdapter } from '../types.ts';
const origin = 'https://demonicscans.org',
  providerId = 'demonicscans';
// Start with unambiguous simple slugs; encoded title paths are not advertised yet.
const id = (value: string) => checkedId(value, /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/);

async function directFetch(path: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(new URL(path, origin).href, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html',
      },
    });
    if (!response.ok) throw new ProviderGatewayError(`HTTP ${response.status}`, response.status);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

export function createDemonicScansAdapter(sourceText: SourceText): ContentProviderAdapter {
  async function detail(sourceId: string) {
    return load(await sourceText(origin, '/manga/' + id(sourceId)));
  }
  async function detailDirect(sourceId: string) {
    return load(await directFetch('/manga/' + id(sourceId)));
  }
  const adapter: ContentProviderAdapter = {
    definition: {
      id: providerId,
      name: 'DemonicScans',
      mediaTypes: ['manga'],
      capabilities: ['search', 'details', 'chapters', 'pages'],
      status: 'limited',
      statusNote:
        'Local images verified; Render upstream HTTP 403. Simple title slugs and generic comic classification only.',
      enabledByDefault: true,
    },
    async search(query) {
      const $ = load(await sourceText(origin, '/search.php?manga=' + encodeURIComponent(query)));
      return $('a[href^="/manga/"]')
        .toArray()
        .flatMap((el) => {
          const a = $(el),
            sourceId = a.attr('href')!.slice(7);
          if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(sourceId)) return [];
          const title = a.find('.seach-right > div').first().text().trim();
          return title
            ? [
                {
                  id: sourceId,
                  sourceId,
                  providerId,
                  mediaType: 'manga' as const,
                  title,
                  coverUrl: a.find('img').attr('src'),
                },
              ]
            : [];
        })
        .slice(0, 20);
    },
    async getDetails(sourceId) {
      const $ = await detail(sourceId),
        title = $('h1').first().text().trim();
      if (!title) throw new ProviderGatewayError('Source details unavailable.', 502);
      return {
        providerId,
        sourceId,
        mediaType: 'manga',
        title,
        coverUrl: $('meta[property="og:image"]').attr('content'),
        description: $('meta[name="description"]').attr('content'),
        genres: [],
      };
    },
    async getChapters(sourceId) {
      const $ = await detail(sourceId),
        chapters = new Map<
          string,
          { id: string; providerId: string; mediaId: string; chapterNumber: number; title: string }
        >();
      $('a[href^="/chaptered.php?"]').each((_, el) => {
        const url = new URL($(el).attr('href')!, origin),
          chapterId = url.searchParams.get('chapter') || '';
        if (!/^[0-9]+(?:[.][0-9]+)?$/.test(chapterId)) return;
        chapters.set(chapterId, {
          id: chapterId,
          providerId,
          mediaId: sourceId,
          chapterNumber: Number(chapterId),
          title: 'Chapter ' + chapterId,
        });
      });
      if (!chapters.size) throw new ProviderGatewayError('Chapter list unavailable.', 502);
      return [...chapters.values()].sort((a, b) => a.chapterNumber - b.chapterNumber);
    },
    async getPages(sourceId, chapterId) {
      checkedId(chapterId, /^[0-9]+(?:[.][0-9]+)?$/);
      const d = await detailDirect(sourceId);
      const link = d('a[href^="/chaptered.php?"]')
        .toArray()
        .map((el) => new URL(d(el).attr('href')!, origin))
        .find((url) => url.searchParams.get('chapter') === chapterId);
      const manga = link?.searchParams.get('manga');
      if (!manga || !/^[0-9]+$/.test(manga))
        throw new ProviderGatewayError('Chapter is not listed for this title.', 404);
      const $ = load(
        await directFetch('/title/' + sourceId + '/chapter/' + chapterId + '/1'),
      );
      const pages = $('img.imgholder')
        .toArray()
        .map((el) => $(el).attr('src') || '')
        .filter((url) => url.startsWith('https://mangareadon.org/'))
        .map((url, index) => ({ pageNumber: index + 1, imageUrl: new URL(url).href }));
      if (!pages.length) throw new ProviderGatewayError('Chapter images unavailable.', 502);
      return pages;
    },
  };

  return adapter;
}
