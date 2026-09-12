import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export const favoriteToggleSchema = z.object({
  mediaId: z.string().min(1),
  providerId: z.string().min(1),
  sourceId: z.string().min(1),
  mediaType: z.string().min(1),
  title: z.string().min(1),
  coverUrl: z.string().min(1),
  status: z.string().default('reading'),
});

export async function getFavorites(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const favorites = await prisma.libraryEntry.findMany({
    where: {
      userId: req.user.userId,
      isFavorite: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({
    success: true,
    data: { favorites },
  });
}

export async function addFavorite(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const item = req.body;
  const entry = await prisma.libraryEntry.upsert({
    where: {
      userId_mediaId: {
        userId: req.user.userId,
        mediaId: item.mediaId,
      },
    },
    update: {
      isFavorite: true,
      title: item.title,
      coverUrl: item.coverUrl,
      status: item.status,
      updatedAt: new Date(),
    },
    create: {
      userId: req.user.userId,
      mediaId: item.mediaId,
      providerId: item.providerId,
      sourceId: item.sourceId,
      mediaType: item.mediaType,
      title: item.title,
      coverUrl: item.coverUrl,
      status: item.status || 'reading',
      isFavorite: true,
    },
  });

  res.status(201).json({
    success: true,
    data: { entry },
  });
}

export async function removeFavorite(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { mediaId } = req.params;
  const existing = await prisma.libraryEntry.findFirst({
    where: {
      userId: req.user.userId,
      mediaId,
    },
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: 'Favorite not found' });
  }

  const entry = await prisma.libraryEntry.update({
    where: { id: existing.id },
    data: { isFavorite: false },
  });

  res.json({
    success: true,
    data: { entry },
  });
}
