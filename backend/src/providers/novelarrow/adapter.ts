import { load } from 'cheerio';
import { checkedId, sourceText } from '../shared/sourceHttp.js';
import {
  ProviderGatewayError,
  type ContentProviderAdapter,
  type BackendSearchResult,
} from '../types.js';

const origin = 'https://novelarrow.com';
const providerId = 'novelarrow';
const id = (v: string) => checkedId(v, /^[a-z0-9][a-z0-9-]{0,220}$/);

type Chapter = {
  chapter_id: string;
  chapter_name: string;
  premium_content?: boolean;
  platinum_content?: boolean;
  coin_price?: number;
};

type NovelInfo = {
  novel_id: string;
  novel_name: string;
  novel_author?: string;
  novel_status?: number;
  novel_desc?: string;
  novel_genres?: string[];
  totalChapter?: number;
};

function cleanDescription(desc?: string): string {
  if (!desc) return '';
  return desc
    .replace(/<\/(?:p|div|h[1-6]|li)>/gi, '\n\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export const novelArrowAdapter: ContentProviderAdapter = {
  definition: {
    id: providerId,
    name: 'NovelArrow',
    mediaTypes: ['novel'],
    capabilities: ['search', 'details', 'chapters', 'textContent'],
    status: 'limited',
    statusNote:
      'Public unlocked text works locally; Render upstream returned HTTP 403. Locked chapters rejected.',
    enabledByDefault: true,
  },
  async search(query) {
    const text = await sourceText(
      origin,
      `/api-web/search?keyword=${encodeURIComponent(query)}`,
    );
    const payload = JSON.parse(text) as { items?: NovelInfo[] };
    if (!Array.isArray(payload.items)) return [];
    const results: BackendSearchResult[] = [];
    for (const item of payload.items) {
      if (!item.novel_id || !item.novel_name) continue;
      if (!/^[a-z0-9][a-z0-9-]{0,220}$/.test(item.novel_id)) continue;
      results.push({
        id: item.novel_id,
        sourceId: item.novel_id,
        providerId,
        mediaType: 'novel',
        title: item.novel_name,
        coverUrl: `https://images.novelarrow.com/novel/${item.novel_id}.jpg`,
      });
    }
    return results.slice(0, 20);
  },
  async getDetails(sourceId) {
    const slug = id(sourceId);
    const text = await sourceText(origin, `/api-web/novels/${slug}`);
    const payload = JSON.parse(text) as { item?: { novelInfo?: NovelInfo } };
    const info = payload.item?.novelInfo;
    if (!info || !info.novel_name) {
      throw new ProviderGatewayError('Novel details unavailable.', 404, 'MEDIA_NOT_FOUND');
    }
    return {
      providerId,
      sourceId: slug,
      mediaType: 'novel',
      title: info.novel_name,
      description: cleanDescription(info.novel_desc),
      coverUrl: `https://images.novelarrow.com/novel/${slug}.jpg`,
      genres: Array.isArray(info.novel_genres) ? info.novel_genres : [],
      status: info.novel_status === 0 ? 'ongoing' : 'completed',
      language: 'en',
    };
  },
  async getChapters(sourceId) {
    const slug = id(sourceId);
    const text = await sourceText(origin, `/api-web/novels/${slug}/chapters?sort=asc`);
    const payload = JSON.parse(text) as { items: Chapter[] };
    if (!Array.isArray(payload.items))
      throw new ProviderGatewayError('Novel chapter list unavailable.', 502);
    return payload.items
      .filter((c) => !c.premium_content && !c.platinum_content && !c.coin_price)
      .map((c, i) => ({
        id: c.chapter_id,
        providerId,
        mediaId: slug,
        chapterNumber: Number(
          c.chapter_name.match(/(?:chapter\s*)?(\d+(?:\.\d+)?)/i)?.[1] ?? i + 1,
        ),
        title: c.chapter_name,
        language: 'en',
      }));
  },
  async getNovelContent(sourceId, chapterId) {
    const slug = id(sourceId);
    const chapId = id(chapterId);
    const text = await sourceText(origin, `/api-web/novels/${slug}/chapters/${chapId}`);
    const payload = JSON.parse(text) as {
      item?: {
        show_button_unlock?: boolean;
        chapterInfo?: Chapter & {
          chapter_content: string;
          prevChapter?: Chapter | null;
          nextChapter?: Chapter | null;
        };
      };
    };
    const item = payload.item;
    const c = item?.chapterInfo;
    if (!c || item?.show_button_unlock || c.premium_content || c.platinum_content || c.coin_price) {
      throw new ProviderGatewayError(
        'Chapter requires source access; not retrieved.',
        403,
        'CONTENT_LOCKED',
      );
    }
    const $ = load(c.chapter_content || '');
    $('script,style').remove();
    const paragraphs = $('p')
      .toArray()
      .map((e) => $(e).text().trim())
      .filter(Boolean);
    if (!paragraphs.length) {
      paragraphs.push(
        ...$.text()
          .split(/\n+/)
          .map((s) => s.trim())
          .filter(Boolean),
      );
    }
    if (!paragraphs.length) throw new ProviderGatewayError('Chapter text unavailable.', 502);
    return {
      providerId,
      mediaId: slug,
      chapterId: chapId,
      title: c.chapter_name,
      paragraphs,
      language: 'en',
      previousChapterId: c.prevChapter?.chapter_id,
      nextChapterId: c.nextChapter?.chapter_id,
    };
  },
};
