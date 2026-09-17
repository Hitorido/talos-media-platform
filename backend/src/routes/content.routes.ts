import { mangaPillImage } from '../providers/mangapill/image.js';
import { Router } from 'express';

import { contentController } from '../controllers/content.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Unified content gateway routes.
 * Provider-specific logic lives in adapters; this router only validates params and delegates.
 */
export const contentRouter = Router();

contentRouter.get('/providers', contentController.listProviders);
contentRouter.get('/mangapill/image', asyncHandler(mangaPillImage));

contentRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    await contentController.search(req, res);
  }),
);

contentRouter.get(
  '/:mediaType/:providerId/:mediaId/chapters/:chapterId/pages',
  asyncHandler(async (req, res) => {
    await contentController.getPages(req, res);
  }),
);

contentRouter.get(
  '/:mediaType/:providerId/:mediaId/chapters/:chapterId/content',
  asyncHandler(async (req, res) => {
    await contentController.getNovelContent(req, res);
  }),
);

contentRouter.get(
  '/:mediaType/:providerId/:mediaId/chapters',
  asyncHandler(async (req, res) => {
    await contentController.getChapters(req, res);
  }),
);

contentRouter.get(
  '/:mediaType/:providerId/:mediaId/episodes/:episodeId/playback',
  asyncHandler(async (req, res) => {
    await contentController.getPlayback(req, res);
  }),
);

contentRouter.get(
  '/:mediaType/:providerId/:mediaId/episodes',
  asyncHandler(async (req, res) => {
    await contentController.getEpisodes(req, res);
  }),
);

contentRouter.get(
  '/:mediaType/:providerId/:mediaId',
  asyncHandler(async (req, res) => {
    await contentController.getDetails(req, res);
  }),
);
