import { load } from 'cheerio';
import { checkedId, sourceText } from '../shared/sourceHttp.js';
import { ProviderGatewayError, type ContentProviderAdapter, type BackendSearchResult } from '../types.js';

// Both sites currently expose the same public HTML contract. IDs remain source-scoped.
function createAdapter(providerId: string, name: string, origin: string): ContentProviderAdapter {
  const id = (value: string) => checkedId(value, /^[0-9]+-[a-z0-9-]+$/);
  return {
    definition: { id: providerId, name, mediaTypes: ['manga'], capabilities: ['search','details','chapters','pages'],
      status: 'limited', statusNote: 'Local images work; Render upstream HTTP 403. Some source images dead; format/phone validation pending.', enabledByDefault: true },
    async search(query) {
      const $ = load(await sourceText(origin, '/search?q=' + encodeURIComponent(query)));
      const results = new Map<string, BackendSearchResult>();
      $('a[href^="/manga/"][title]').each((_, el) => {
        const a = $(el), sourceId = a.attr('href')!.slice(7);
        if (!/^[0-9]+-[a-z0-9-]+$/.test(sourceId) || results.has(sourceId)) return;
        const title = a.attr('title')?.trim();
        if (title) results.set(sourceId, { id: sourceId, sourceId, providerId, mediaType: 'manga', title, coverUrl: a.find('img').attr('data-src') });
      });
      return [...results.values()].slice(0,20);
    },
    async getDetails(sourceId) {
      const $ = load(await sourceText(origin, '/manga/' + id(sourceId)));
      const title = $('h1').first().text().trim();
      if (!title) throw new ProviderGatewayError('Source details unavailable.',502);
      return { providerId, sourceId, mediaType: 'manga', title,
        coverUrl: $('.img-cover img').first().attr('data-src'), description: $('.summary .content').text().trim(), genres: [] };
    },
    async getChapters(sourceId) {
      const prefix = '/manga/' + id(sourceId) + '/chapter-';
      const $ = load(await sourceText(origin, '/manga/' + sourceId));
      const chapters = new Map<string, { id: string; providerId: string; mediaId: string; chapterNumber: number; title: string }>();
      $('#chapter-list a').each((_,el) => {
        const href = $(el).attr('href') || '';
        if (!href.startsWith(prefix)) return;
        const chapterId = href.slice(prefix.length);
        if (!/^[0-9]+(?:[.][0-9]+)?$/.test(chapterId)) return;
        chapters.set(chapterId, { id: chapterId, providerId, mediaId: sourceId, chapterNumber: Number(chapterId), title: 'Chapter ' + chapterId });
      });
      if (!chapters.size) throw new ProviderGatewayError('Chapter list unavailable.',502);
      return [...chapters.values()].sort((a,b)=>a.chapterNumber-b.chapterNumber);
    },
    async getPages(sourceId, chapterId) {
      id(sourceId); checkedId(chapterId, /^[0-9]+(?:[.][0-9]+)?$/);
      const html = await sourceText(origin, '/manga/' + sourceId + '/chapter-' + chapterId);
      const literal = html.match(/var chapImages\s*=\s*("[^"\n]*")/)?.[1];
      if (!literal) throw new ProviderGatewayError('Chapter images unavailable.',502);
      const urls = (JSON.parse(literal) as string).split(',').filter(url => /^https:\/\//.test(url));
      if (!urls.length) throw new ProviderGatewayError('Chapter images unavailable.',502);
      return urls.map((imageUrl,index)=>({ pageNumber: index+1, imageUrl }));
    },
  };
}
export const kaliScanAdapter = createAdapter('kaliscan','Kaliscan','https://kaliscan.io');
export const mangaJinxAdapter = createAdapter('mangajinx','MangaJinx','https://mgjinx.com');
