import { Router } from 'express';
import {
  addLibraryItemSchema,
  addOrUpdateLibraryItem,
  getLibrary,
  removeLibraryItem,
  syncLibrary,
  syncLibrarySchema,
} from '../controllers/library.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const libraryRouter = Router();

libraryRouter.use(requireAuth);
libraryRouter.get('/', asyncHandler(getLibrary));
libraryRouter.post('/', validateBody(addLibraryItemSchema), asyncHandler(addOrUpdateLibraryItem));
libraryRouter.put('/', validateBody(addLibraryItemSchema), asyncHandler(addOrUpdateLibraryItem));
libraryRouter.delete('/:mediaId', asyncHandler(removeLibraryItem));
// Bulk upsert contract for Step 13 sync — no client sync queue in Step 12.
libraryRouter.post('/sync', validateBody(syncLibrarySchema), asyncHandler(syncLibrary));
