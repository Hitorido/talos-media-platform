import {
  isNovelGatewayConfigured,
  novelGatewayGetChapterContent,
  novelGatewayGetChapters,
  novelGatewayGetNovel,
  novelGatewaySearch,
} from './gateway.js';
import type { ContentProviderAdapter } from '../types.js';
import { ProviderGatewayError } from '../types.js';

const PROVIDER_ID = 'proxy-novel';

export const novelProviderAdapter: ContentProviderAdapter = {
  definition: {
    id: PROVIDER_ID,
    name: 'Novel Backend Proxy',
    description:
      'Proxies novel search/details/chapters/text through NOVEL_GATEWAY_URL. No in-server scraping.',
    mediaTypes: ['novel'],
    capabilities: ['search', 'details', 'chapters', 'textContent', 'downloads'],
    status: isNovelGatewayConfigured() ? 'available' : 'requires-configuration',
    statusNote: isNovelGatewayConfigured()
      ? 'NOVEL_GATEWAY_URL is set. Upstream availability depends on the external service.'
      : 'Set NOVEL_GATEWAY_URL to a compatible novel content service.',
    enabledByDefault: true,
    configKey: 'novel',
  },

  async search(query) {
    if (!isNovelGatewayConfigured()) {
      throw new ProviderGatewayError(
        'Novel gateway requires configuration. Set NOVEL_GATEWAY_URL.',
        503,
        'REQUIRES_CONFIGURATION',
      );
    }
    const results = await novelGatewaySearch(query);
    return results.map((item) => ({
      id: item.id,
      providerId: PROVIDER_ID,
      sourceId: item.id,
      mediaType: 'novel' as const,
      title: item.title,
      coverUrl: item.coverUrl,
      author: item.author,
      description: item.description,
      genres: item.genres,
      status: item.status,
    }));
  },

  async getDetails(sourceId) {
    if (!isNovelGatewayConfigured()) {
      throw new ProviderGatewayError(
        'Novel gateway requires configuration. Set NOVEL_GATEWAY_URL.',
        503,
        'REQUIRES_CONFIGURATION',
      );
    }
    const info = await novelGatewayGetNovel(sourceId);
    return {
      providerId: PROVIDER_ID,
      sourceId: info.id,
      mediaType: 'novel',
      title: info.title,
      alternativeTitles: info.alternativeTitles,
      description: info.description,
      coverUrl: info.coverUrl,
      bannerUrl: info.bannerUrl,
      genres: info.genres,
      status: info.status,
      author: info.author,
      rating: info.rating,
      language: info.language,
    };
  },

  async getChapters(sourceId) {
    if (!isNovelGatewayConfigured()) {
      throw new ProviderGatewayError(
        'Novel gateway requires configuration. Set NOVEL_GATEWAY_URL.',
        503,
        'REQUIRES_CONFIGURATION',
      );
    }
    const chapters = await novelGatewayGetChapters(sourceId);
    return chapters.map((chapter) => ({
      id: chapter.id,
      providerId: PROVIDER_ID,
      mediaId: sourceId,
      title: chapter.title,
      chapterNumber: chapter.number,
      volumeNumber: chapter.volumeNumber,
      language: chapter.language,
      releaseDate: chapter.releaseDate,
      wordCount: chapter.wordCount,
    }));
  },

  async getNovelContent(sourceId, chapterId) {
    if (!isNovelGatewayConfigured()) {
      throw new ProviderGatewayError(
        'Novel gateway requires configuration. Set NOVEL_GATEWAY_URL.',
        503,
        'REQUIRES_CONFIGURATION',
      );
    }
    const content = await novelGatewayGetChapterContent(sourceId, chapterId);
    if (!content.paragraphs.length) {
      throw new ProviderGatewayError('Chapter content not found.', 404, 'CONTENT_NOT_FOUND');
    }
    return {
      providerId: PROVIDER_ID,
      mediaId: sourceId,
      chapterId: content.chapterId,
      title: content.title,
      paragraphs: content.paragraphs,
      wordCount: content.wordCount,
      language: content.language,
      previousChapterId: content.previousChapterId,
      nextChapterId: content.nextChapterId,
    };
  },
};
