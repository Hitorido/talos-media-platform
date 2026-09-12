import { Router } from 'express';
import {
  getMe,
  login,
  loginSchema,
  register,
  registerSchema,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), asyncHandler(register));
authRouter.post('/login', validateBody(loginSchema), asyncHandler(login));
authRouter.get('/me', requireAuth, asyncHandler(getMe));
authRouter.post('/logout', requireAuth, (_req, res) => {
  // JWT is stateless — clients discard the token. Endpoint exists for API symmetry.
  res.json({
    success: true,
    message: 'Logged out',
  });
});
