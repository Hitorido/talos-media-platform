import { Router, type Response } from 'express';

import { contentGateway } from '../providers/contentGateway.js';
import {
  getNovelGatewayUrl,
  isNovelGatewayConfigured,
} from '../providers/novel/gateway.js';
import { ProviderGatewayError } from '../providers/types.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const NOVEL_PROVIDER_ID = 'proxy-novel';

/**
 * Backward-compatible novel routes.
 * Internally delegates to the unified content gateway + novel adapter.
 */
export const novelRouter = Router();

function sendError(res: Response, error: unknown) {
  if (error instanceof ProviderGatewayError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
    });
    return;
  }
  const status = (error as Error & { status?: number }).status ?? 502;
  res.status(status).json({
    success: false,
    error: error instanceof Error ? error.message : 'Novel request failed.',
  });
}

novelRouter.get(
  '/status',
  asyncHandler(async (_req, res) => {
    const configured = isNovelGatewayConfigured();
    res.json({
      success: true,
      data: {
        configured,
        gatewayUrlConfigured: configured,
        gatewayHost: configured ? new URL(getNovelGatewayUrl()!).host : null,
        providerId: NOVEL_PROVIDER_ID,
        status: configured ? 'available' : 'requires-configuration',
        contract: {
          search: 'GET /search?q=',
          details: 'GET /:novelId',
          chapters: 'GET /:novelId/chapters',
          content: 'GET /:novelId/chapters/:chapterId',
          unified: 'GET /api/content/novel/proxy-novel/:mediaId...',
        },
        note: configured
          ? 'Novel gateway URL is configured. Upstream availability depends on the external service.'
          : 'Set NOVEL_GATEWAY_URL to enable novel content proxying. No scraping is implemented in this backend.',
      },
    });
  }),
);

novelRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    try {
      const result = await contentGateway.search({
        mediaType: 'novel',
        query,
        providerId: NOVEL_PROVIDER_ID,
      });
      res.json({
        success: true,
        data: {
          results: result.results.map((item) => ({
            id: item.sourceId,
            title: item.title,
            coverUrl: item.coverUrl,
            author: item.author,
            description: item.description,
            genres: item.genres,
            status: item.status,
          })),
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  }),
);

novelRouter.get(
  '/:novelId/chapters/:chapterId',
  asyncHandler(async (req, res) => {
    try {
      const content = await contentGateway.getNovelContent(
        NOVEL_PROVIDER_ID,
        req.params.novelId,
        req.params.chapterId,
      );
      res.json({
        success: true,
        data: {
          chapterId: content.chapterId,
          title: content.title,
          paragraphs: content.paragraphs,
          wordCount: content.wordCount,
          language: content.language,
          previousChapterId: content.previousChapterId,
          nextChapterId: content.nextChapterId,
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  }),
);

novelRouter.get(
  '/:novelId/chapters',
  asyncHandler(async (req, res) => {
    try {
      const chapters = await contentGateway.getChapters(
        'novel',
        NOVEL_PROVIDER_ID,
        req.params.novelId,
      );
      res.json({
        success: true,
        data: {
          chapters: chapters.map((chapter) => ({
            id: chapter.id,
            title: chapter.title,
            number: chapter.chapterNumber,
            volumeNumber: chapter.volumeNumber,
            releaseDate: chapter.releaseDate,
            wordCount: chapter.wordCount,
            language: chapter.language,
          })),
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  }),
);

novelRouter.get(
  '/:novelId',
  asyncHandler(async (req, res) => {
    try {
      const novel = await contentGateway.getDetails(
        'novel',
        NOVEL_PROVIDER_ID,
        req.params.novelId,
      );
      res.json({
        success: true,
        data: {
          id: novel.sourceId,
          title: novel.title,
          coverUrl: novel.coverUrl,
          bannerUrl: novel.bannerUrl,
          author: novel.author,
          description: novel.description,
          genres: novel.genres,
          status: novel.status,
          alternativeTitles: novel.alternativeTitles,
          rating: novel.rating,
          language: novel.language,
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  }),
);
