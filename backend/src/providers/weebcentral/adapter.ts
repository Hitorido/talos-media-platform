import { load } from 'cheerio';
import { checkedId, sourceText } from '../shared/sourceHttp.js';
import { ProviderGatewayError, type ContentProviderAdapter, type BackendSearchResult } from '../types.js';
const origin = 'https://weebcentral.com';
const providerId = 'weebcentral';
const id = (value: string) => checkedId(value, /^[0-9A-HJKMNP-TV-Z]{26}$/);
const clean = (text: string) => text.replace(/\s+/g, ' ').trim();

export const weebCentralAdapter: ContentProviderAdapter = {
  definition: { id: providerId, name: 'WeebCentral', mediaTypes: ['manga','manhwa','manhua'], capabilities: ['search','details','chapters','pages'], status: 'limited', statusNote: 'Normal HTTP content flow verified locally; Render and physical reader verification pending.', enabledByDefault: true },
  async search(query, mediaType) {
    const $ = load(await sourceText(origin, `/search/data?text=${encodeURIComponent(query)}`));
    const results = new Map<string, BackendSearchResult>();
    $('a[href*="/series/"]').each((_, el) => {
      const a = $(el), sourceId = a.attr('href')?.match(/\/series\/([0-9A-HJKMNP-TV-Z]{26})/)?.[1];
      if (!sourceId || results.has(sourceId)) return;
      const article = a.closest('article.bg-base-300');
      const title = a.find('img').attr('alt')?.replace(/ cover$/, '') || clean(a.text());
      const format = article.find('[data-tip="Manhwa"]').length ? 'manhwa' : article.find('[data-tip="Manhua"]').length ? 'manhua' : 'manga';
      if (mediaType && format !== mediaType) return;
      results.set(sourceId, { id: sourceId, sourceId, providerId, mediaType: format, title, coverUrl: article.find('img').first().attr('src') });
    });
    return [...results.values()].slice(0, 12);
  },
  async getDetails(sourceId) {
    const $ = load(await sourceText(origin, `/series/${id(sourceId)}`));
    const title = clean($('h1').first().text());
    if (!title) throw new ProviderGatewayError('Source details missing.', 502);
    const text = $('main').text() || $('body').text();
    const mediaType = /Type:\s*Manhwa/i.test(text) ? 'manhwa' : /Type:\s*Manhua/i.test(text) ? 'manhua' : 'manga';
    return { providerId, sourceId, mediaType, title, description: $('p').first().text().trim(), coverUrl: $('img[alt$="cover"]').first().attr('src') || $('meta[property="og:image"]').attr('content'), genres: [], language: 'en' };
  },
  async getChapters(sourceId) {
    const $ = load(await sourceText(origin, `/series/${id(sourceId)}/full-chapter-list`));
    const chapters = $('a[href*="/chapters/"]').toArray().map(el => {
      const a=$(el), chapterId=a.attr('href')?.match(/\/chapters\/([0-9A-HJKMNP-TV-Z]{26})/)?.[1];
      const chapterNumber=Number(clean(a.text()).match(/Chapter\s+([\d.]+)/i)?.[1]);
      return chapterId && Number.isFinite(chapterNumber) ? { id: chapterId, providerId, mediaId: sourceId, chapterNumber, title: `Chapter ${chapterNumber}`, language: 'en', releaseDate: a.find('time').attr('datetime') } : null;
    }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    if (!chapters.length) throw new ProviderGatewayError('Source returned no chapters.', 502);
    return chapters.sort((a,b)=>a.chapterNumber-b.chapterNumber);
  },
  async getPages(sourceId, chapterId) {
    id(sourceId); id(chapterId);
    const $=load(await sourceText(origin, `/chapters/${chapterId}/images?reading_style=long_strip`));
    const pages=$('img').toArray().map(el=>$(el).attr('src')).filter((url): url is string => !!url && /^https:\/\//.test(url)).map((imageUrl,index)=>({pageNumber:index+1,imageUrl}));
    if (!pages.length) throw new ProviderGatewayError('Source returned no page images.',502);
    return pages;
  },
};
