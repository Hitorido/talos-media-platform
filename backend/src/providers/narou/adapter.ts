import { ProviderGatewayError } from '../types.js';
import { ENV } from '../../config/env.js';
import type {
  BackendNormalizedChapter,
  BackendNormalizedMedia,
  BackendNormalizedNovelContent,
  BackendSearchResult,
  ContentProviderAdapter,
} from '../types.js';

const PROVIDER_ID = 'narou';
const API_URL = 'https://api.syosetu.com/novelapi/api/';
const SITE_URL = 'https://ncode.syosetu.com';

type NarouNovel = {
  ncode: string;
  title: string;
  writer?: string;
  story?: string;
  keyword?: string;
  general_all_no?: number;
  end?: number;
  novel_type?: number;
};

function decodeHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim();
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ENV.PROVIDER_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/html,application/json', 'User-Agent': 'Talos/1.0' },
    });
    if (!response.ok) {
      throw new ProviderGatewayError(
        `Narou request failed with HTTP ${response.status}.`,
        response.status === 404 ? 404 : 502,
        response.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_FAILED',
      );
    }
    return await response.text();
  } catch (error) {
    if (error instanceof ProviderGatewayError) throw error;
    throw new ProviderGatewayError(
      error instanceof Error && error.name === 'AbortError'
        ? 'Narou request timed out.'
        : `Narou request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      502,
      'UPSTREAM_FAILED',
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchNovel(ncode: string): Promise<NarouNovel> {
  const payload = JSON.parse(
    await fetchText(`${API_URL}?out=json&ncode=${encodeURIComponent(ncode)}`),
  ) as Array<NarouNovel | { allcount?: number }>;
  const novel = payload.find((item): item is NarouNovel => 'ncode' in item);
  if (!novel) throw new ProviderGatewayError('Narou novel was not found.', 404, 'NOT_FOUND');
  return novel;
}

function parseChapterList(ncode: string, html: string): BackendNormalizedChapter[] {
  const chapters: BackendNormalizedChapter[] = [];
  const pattern = /<a\s+href="\/(n[a-z0-9]+)\/(\d+)\/"[^>]*class="p-eplist__subtitle"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const chapterNumber = Number.parseInt(match[2], 10);
    if (!Number.isFinite(chapterNumber)) continue;
    chapters.push({
      id: match[2],
      providerId: PROVIDER_ID,
      mediaId: ncode,
      title: decodeHtml(match[3]),
      chapterNumber,
      language: 'ja',
    });
  }
  return chapters;
}

function parseChapterContent(ncode: string, chapterId: string, html: string): BackendNormalizedNovelContent {
  const title = decodeHtml(html.match(/<h1[^>]*class="[^"]*p-novel__title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '');
  const body = html.match(/<div class="js-novel-text[^"]*">([\s\S]*?)<\/div>/i)?.[1] ?? '';
  const paragraphs = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => decodeHtml(match[1]))
    .filter(Boolean);
  if (paragraphs.length === 0) {
    throw new ProviderGatewayError('Narou chapter returned no text content.', 502, 'CONTENT_NOT_FOUND');
  }
  return {
    providerId: PROVIDER_ID,
    mediaId: ncode,
    chapterId,
    title: title || `Chapter ${chapterId}`,
    paragraphs,
    wordCount: paragraphs.join('').length,
    language: 'ja',
  };
}

export const narouProviderAdapter: ContentProviderAdapter = {
  definition: {
    id: PROVIDER_ID,
    name: 'Shosetsuka ni Narou',
    description: 'Official Japanese web-novel API and public chapter pages.',
    mediaTypes: ['novel'],
    capabilities: ['search', 'details', 'chapters', 'textContent'],
    status: 'available',
    statusNote: 'Uses the official Narou metadata API and public novel pages with normal requests.',
    enabledByDefault: true,
  },

  async search(query): Promise<BackendSearchResult[]> {
    const payload = JSON.parse(
      await fetchText(`${API_URL}?out=json&lim=12&word=${encodeURIComponent(query)}`),
    ) as Array<NarouNovel | { allcount?: number }>;
    return payload
      .filter((item): item is NarouNovel => 'ncode' in item)
      .map((item) => ({
        id: item.ncode,
        providerId: PROVIDER_ID,
        sourceId: item.ncode,
        mediaType: 'novel' as const,
        title: item.title,
        coverUrl: `https://sbo.syosetu.com/${item.ncode.toLowerCase()}/twitter.png`,
        author: item.writer,
        description: item.story,
        genres: item.keyword?.split(/\s+/).filter(Boolean).slice(0, 8),
        status: item.end === 1 ? 'completed' : 'ongoing',
      }));
  },

  async getDetails(sourceId): Promise<BackendNormalizedMedia> {
    const item = await fetchNovel(sourceId);
    return {
      providerId: PROVIDER_ID,
      sourceId: item.ncode,
      mediaType: 'novel',
      title: item.title,
      description: item.story,
      coverUrl: `https://sbo.syosetu.com/${item.ncode.toLowerCase()}/twitter.png`,
      genres: item.keyword?.split(/\s+/).filter(Boolean).slice(0, 8),
      status: item.end === 1 ? 'completed' : 'ongoing',
      author: item.writer,
      language: 'ja',
    };
  },

  async getChapters(sourceId): Promise<BackendNormalizedChapter[]> {
    const html = await fetchText(`${SITE_URL}/${encodeURIComponent(sourceId.toLowerCase())}/`);
    return parseChapterList(sourceId.toLowerCase(), html);
  },

  async getNovelContent(sourceId, chapterId): Promise<BackendNormalizedNovelContent> {
    const html = await fetchText(
      `${SITE_URL}/${encodeURIComponent(sourceId.toLowerCase())}/${encodeURIComponent(chapterId)}/`,
    );
    return parseChapterContent(sourceId, chapterId, html);
  },
};
