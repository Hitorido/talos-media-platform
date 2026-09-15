import {
  getAsuraChapters,
  getAsuraDetails,
  getAsuraPages,
  searchAsura,
} from './scraper.js';
import type { ContentProviderAdapter } from '../types.js';
import { ProviderGatewayError } from '../types.js';

const PROVIDER_ID = 'asurascans';

export const asuraScansAdapter: ContentProviderAdapter = {
  definition: {
    id: PROVIDER_ID,
    name: 'Asura Scans',
    description: 'Manhwa provider via normal web scraping with rate limiting.',
    mediaTypes: ['manhwa'],
    capabilities: ['search', 'details', 'chapters', 'pages'],
    status: 'limited',
    statusNote:
      'The homepage is reachable without a challenge, but the previously identified search route currently returns HTTP 404. Keep disabled until the public route contract is revalidated.',
    enabledByDefault: false,
    configKey: 'scraper',
  },

  async search(query) {
    try {
      const results = await searchAsura(query);
      return results.map((item) => ({
        id: item.id,
        providerId: PROVIDER_ID,
        sourceId: item.slug,
        mediaType: 'manhwa' as const,
        title: item.title,
        coverUrl: item.coverUrl,
        author: item.author,
        description: item.description,
        genres: item.genres,
        status: item.status,
      }));
    } catch (error) {
      throw new ProviderGatewayError(
        `Asura Scans search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        502,
        'SEARCH_FAILED',
      );
    }
  },

  async getDetails(sourceId) {
    try {
      const info = await getAsuraDetails(sourceId);
      return {
        providerId: PROVIDER_ID,
        sourceId: info.slug,
        mediaType: 'manhwa',
        title: info.title,
        alternativeTitles: [],
        description: info.description,
        coverUrl: info.coverUrl,
        bannerUrl: info.coverUrl,
        genres: info.genres,
        status: info.status,
        author: info.author,
        rating: undefined,
        language: 'en',
      };
    } catch (error) {
      throw new ProviderGatewayError(
        `Asura Scans details failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        502,
        'DETAILS_FAILED',
      );
    }
  },

  async getChapters(sourceId) {
    try {
      const chapters = await getAsuraChapters(sourceId);
      return chapters.map((chapter) => ({
        id: chapter.id,
        providerId: PROVIDER_ID,
        mediaId: sourceId,
        title: chapter.title,
        chapterNumber: chapter.chapterNumber,
        volumeNumber: undefined,
        language: 'en',
        releaseDate: chapter.releaseDate,
        wordCount: undefined,
      }));
    } catch (error) {
      throw new ProviderGatewayError(
        `Asura Scans chapters failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        502,
        'CHAPTERS_FAILED',
      );
    }
  },

  async getPages(sourceId, chapterId) {
    try {
      const pages = await getAsuraPages(chapterId);
      return pages.map((imageUrl, index) => ({
        pageNumber: index + 1,
        imageUrl,
        aspectRatio: 0.67,
      }));
    } catch (error) {
      throw new ProviderGatewayError(
        `Asura Scans pages failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        502,
        'PAGES_FAILED',
      );
    }
  },
};