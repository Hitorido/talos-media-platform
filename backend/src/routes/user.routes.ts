import { Router } from 'express';
import { updateProfile, updateProfileSchema } from '../controllers/user.controller.js';
import { getMe } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const userRouter = Router();

userRouter.use(requireAuth);
userRouter.get('/profile', asyncHandler(getMe));
userRouter.patch('/profile', validateBody(updateProfileSchema), asyncHandler(updateProfile));
