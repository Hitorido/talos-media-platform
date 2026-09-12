import { Router } from 'express';
import {
  getProgress,
  upsertReadingProgress,
  upsertReadingProgressSchema,
  upsertWatchProgress,
  upsertWatchProgressSchema,
} from '../controllers/progress.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const progressRouter = Router();

progressRouter.use(requireAuth);
progressRouter.get('/', asyncHandler(getProgress));
progressRouter.put(
  '/reading',
  validateBody(upsertReadingProgressSchema),
  asyncHandler(upsertReadingProgress),
);
progressRouter.put(
  '/watching',
  validateBody(upsertWatchProgressSchema),
  asyncHandler(upsertWatchProgress),
);
