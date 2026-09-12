import { Router } from 'express';
import {
  addOrUpdateHistory,
  clearHistory,
  getHistory,
  removeHistoryItem,
  upsertHistorySchema,
} from '../controllers/history.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const historyRouter = Router();

historyRouter.use(requireAuth);
historyRouter.get('/', asyncHandler(getHistory));
historyRouter.post('/', validateBody(upsertHistorySchema), asyncHandler(addOrUpdateHistory));
historyRouter.delete('/clear', asyncHandler(clearHistory));
historyRouter.delete('/:id', asyncHandler(removeHistoryItem));
