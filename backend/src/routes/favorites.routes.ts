import { Router } from 'express';
import {
  addFavorite,
  favoriteToggleSchema,
  getFavorites,
  removeFavorite,
} from '../controllers/favorites.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const favoritesRouter = Router();

favoritesRouter.use(requireAuth);
favoritesRouter.get('/', asyncHandler(getFavorites));
favoritesRouter.post('/', validateBody(favoriteToggleSchema), asyncHandler(addFavorite));
favoritesRouter.delete('/:mediaId', asyncHandler(removeFavorite));
