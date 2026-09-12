import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export const updateProfileSchema = z.object({
  bio: z.string().max(300).optional(),
  preferredLanguage: z.string().max(10).optional(),
  preferredTheme: z.string().max(20).optional(),
  avatarUrl: z.union([z.string().url(), z.literal('')]).optional(),
});

export async function updateProfile(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { bio, preferredLanguage, preferredTheme, avatarUrl } = req.body;

  if (avatarUrl) {
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { avatarUrl },
    });
  }

  const profile = await prisma.profile.upsert({
    where: { userId: req.user.userId },
    update: {
      bio: bio !== undefined ? bio : undefined,
      preferredLanguage: preferredLanguage || undefined,
      preferredTheme: preferredTheme || undefined,
    },
    create: {
      userId: req.user.userId,
      bio: bio || '',
      preferredLanguage: preferredLanguage || 'en',
      preferredTheme: preferredTheme || 'dark',
    },
  });

  res.json({
    success: true,
    data: { profile },
  });
}
