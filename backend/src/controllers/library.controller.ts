import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export const syncLibrarySchema = z.object({
  items: z.array(
    z.object({
      mediaId: z.string(),
      providerId: z.string(),
      sourceId: z.string(),
      mediaType: z.string(),
      title: z.string(),
      coverUrl: z.string(),
      status: z.string().default('reading'),
      isFavorite: z.boolean().default(false),
      currentChapter: z.string().optional(),
      currentEpisode: z.string().optional(),
    }),
  ),
});

export const addLibraryItemSchema = z.object({
  mediaId: z.string(),
  providerId: z.string(),
  sourceId: z.string(),
  mediaType: z.string(),
  title: z.string(),
  coverUrl: z.string(),
  status: z.string().default('reading'),
  isFavorite: z.boolean().default(false),
  currentChapter: z.string().optional(),
  currentEpisode: z.string().optional(),
});

export async function getLibrary(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const library = await prisma.libraryEntry.findMany({
    where: { userId: req.user.userId },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({
    success: true,
    data: { library },
  });
}

export async function addOrUpdateLibraryItem(req: AuthRequest, res: Response) {
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
      status: item.status,
      isFavorite: item.isFavorite,
      currentChapter: item.currentChapter,
      currentEpisode: item.currentEpisode,
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
      isFavorite: item.isFavorite || false,
      currentChapter: item.currentChapter,
      currentEpisode: item.currentEpisode,
    },
  });

  res.json({
    success: true,
    data: { entry },
  });
}

export async function removeLibraryItem(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { mediaId } = req.params;
  await prisma.libraryEntry.deleteMany({
    where: {
      userId: req.user.userId,
      mediaId,
    },
  });

  res.json({
    success: true,
    message: 'Library item removed',
  });
}

export async function syncLibrary(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { items } = req.body;
  const userId = req.user.userId;

  for (const item of items) {
    await prisma.libraryEntry.upsert({
      where: {
        userId_mediaId: {
          userId,
          mediaId: item.mediaId,
        },
      },
      update: {
        status: item.status,
        isFavorite: item.isFavorite,
        currentChapter: item.currentChapter,
        currentEpisode: item.currentEpisode,
        updatedAt: new Date(),
      },
      create: {
        userId,
        mediaId: item.mediaId,
        providerId: item.providerId,
        sourceId: item.sourceId,
        mediaType: item.mediaType,
        title: item.title,
        coverUrl: item.coverUrl,
        status: item.status || 'reading',
        isFavorite: item.isFavorite || false,
        currentChapter: item.currentChapter,
        currentEpisode: item.currentEpisode,
      },
    });
  }

  const updatedLibrary = await prisma.libraryEntry.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({
    success: true,
    data: { library: updatedLibrary },
  });
}
