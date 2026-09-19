import { load } from 'cheerio';
import { checkedId, sourceText } from '../shared/sourceHttp.js';
import { ProviderGatewayError, type ContentProviderAdapter } from '../types.js';

const origin = 'https://www.novelcodex.org';
const providerId = 'novelcodex';
const id = (value: string) => checkedId(value, /^[a-z0-9][a-z0-9-]{0,220}$/);
async function publicLimit(sourceId: string): Promise<number> {
  const access = JSON.parse(await sourceText(origin, '/api/novels/' + id(sourceId) + '/access'));
  if (!Number.isSafeInteger(access.lockThreshold) || access.lockThreshold < 0 ||
      !Number.isSafeInteger(access.total) || access.total < 0) {
    throw new ProviderGatewayError('Public chapter access could not be verified.', 502);
  }
  return Math.min(access.lockThreshold, access.total);
}
export const novelCodexAdapter: ContentProviderAdapter = {
  definition: {
    id: providerId, name: 'NovelCodex.org', mediaTypes: ['novel'],
    capabilities: ['search', 'details', 'chapters', 'textContent'], status: 'limited',
    statusNote: 'Public free chapter flow verified through Render; physical reader validation pending.', enabledByDefault: true,
  },
  async search(query) {
    const data = JSON.parse(await sourceText(origin, '/api/novels/search?q=' + encodeURIComponent(query)));
    if (!Array.isArray(data.items)) throw new ProviderGatewayError('Search unavailable.', 502);
    return data.items.slice(0, 20).map((item: { slug: string; title: string; cover_url?: string; author?: string; genres?: string[]; total_chapters?: number }) => ({
      id: id(item.slug), sourceId: item.slug, providerId, mediaType: 'novel' as const,
      chapterCount: Number.isSafeInteger(item.total_chapters) && (item.total_chapters ?? 0) > 0 ? item.total_chapters : undefined,
      title: item.title, coverUrl: item.cover_url, author: item.author, genres: item.genres,
    }));
  },
  async getDetails(sourceId) {
    const $ = load(await sourceText(origin, '/novel/' + id(sourceId)));
    const title = $('h1').first().text().trim();
    if (!title) throw new ProviderGatewayError('Novel details unavailable.', 502);
    return { providerId, sourceId, mediaType: 'novel', title,
      description: $('meta[name="description"]').attr('content'),
      coverUrl: $('meta[property="og:image"]').attr('content'), genres: [], language: 'en' };
  },
  async getChapters(sourceId) {
    const limit = await publicLimit(sourceId);
    const data = JSON.parse(await sourceText(origin, '/api/chapters/' + id(sourceId) + '?v=2'));
    if (!Array.isArray(data.titles) || !Number.isSafeInteger(data.start) ||
        (data.nums != null && (!Array.isArray(data.nums) || data.nums.length !== data.titles.length))) {
      throw new ProviderGatewayError('Chapter list unavailable.', 502);
    }
    return data.titles.map((title: string, index: number) => {
      const number = data.nums?.[index] ?? data.start + index;
      return { id: String(number), providerId, mediaId: sourceId, chapterNumber: number, title, language: 'en' };
    }).filter((chapter: { chapterNumber: number }) => Number.isSafeInteger(chapter.chapterNumber) && chapter.chapterNumber > 0 && chapter.chapterNumber <= limit);
  },
  async getNovelContent(sourceId, chapterId) {
    checkedId(chapterId, /^[1-9][0-9]{0,6}$/);
    const number = Number(chapterId), limit = await publicLimit(sourceId);
    if (number > limit) throw new ProviderGatewayError('Chapter requires source access; not retrieved.', 403, 'CONTENT_LOCKED');
    const $ = load(await sourceText(origin, '/novel/' + id(sourceId) + '/read/' + chapterId));
    $('script,style').remove();
    const paragraphs = $('article p').toArray().map(el => $(el).text().trim()).filter(Boolean);
    if (!paragraphs.length) throw new ProviderGatewayError('Public chapter text unavailable.', 502);
    return { providerId, mediaId: sourceId, chapterId, title: $('h1').first().text().trim(), paragraphs, language: 'en',
      previousChapterId: number > 1 ? String(number - 1) : undefined,
      nextChapterId: number < limit ? String(number + 1) : undefined };
  },
};
