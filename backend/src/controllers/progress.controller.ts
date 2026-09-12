import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export const upsertReadingProgressSchema = z.object({
  mediaId: z.string().min(1),
  chapterId: z.string().min(1),
  chapterNumber: z.number(),
  chapterTitle: z.string().min(1),
  pageNumber: z.number().int().min(1).default(1),
  totalPages: z.number().int().min(1).default(1),
  progress: z.number().min(0).max(1).default(0),
});

export const upsertWatchProgressSchema = z.object({
  mediaId: z.string().min(1),
  episodeId: z.string().min(1),
  episodeNumber: z.number().int().min(0),
  episodeTitle: z.string().min(1),
  positionSeconds: z.number().min(0).default(0),
  durationSeconds: z.number().min(0).default(0),
});

export async function getProgress(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const mediaId = typeof req.query.mediaId === 'string' ? req.query.mediaId : undefined;

  const [reading, watching] = await Promise.all([
    prisma.readingProgress.findMany({
      where: {
        userId: req.user.userId,
        ...(mediaId ? { mediaId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.watchProgress.findMany({
      where: {
        userId: req.user.userId,
        ...(mediaId ? { mediaId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  res.json({
    success: true,
    data: {
      reading,
      watching,
    },
  });
}

export async function upsertReadingProgress(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const item = req.body;
  const entry = await prisma.readingProgress.upsert({
    where: {
      userId_mediaId_chapterId: {
        userId: req.user.userId,
        mediaId: item.mediaId,
        chapterId: item.chapterId,
      },
    },
    update: {
      chapterNumber: item.chapterNumber,
      chapterTitle: item.chapterTitle,
      pageNumber: item.pageNumber,
      totalPages: item.totalPages,
      progress: item.progress,
    },
    create: {
      userId: req.user.userId,
      mediaId: item.mediaId,
      chapterId: item.chapterId,
      chapterNumber: item.chapterNumber,
      chapterTitle: item.chapterTitle,
      pageNumber: item.pageNumber,
      totalPages: item.totalPages,
      progress: item.progress,
    },
  });

  res.json({
    success: true,
    data: { entry },
  });
}

export async function upsertWatchProgress(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const item = req.body;
  const entry = await prisma.watchProgress.upsert({
    where: {
      userId_mediaId_episodeId: {
        userId: req.user.userId,
        mediaId: item.mediaId,
        episodeId: item.episodeId,
      },
    },
    update: {
      episodeNumber: item.episodeNumber,
      episodeTitle: item.episodeTitle,
      positionSeconds: item.positionSeconds,
      durationSeconds: item.durationSeconds,
    },
    create: {
      userId: req.user.userId,
      mediaId: item.mediaId,
      episodeId: item.episodeId,
      episodeNumber: item.episodeNumber,
      episodeTitle: item.episodeTitle,
      positionSeconds: item.positionSeconds,
      durationSeconds: item.durationSeconds,
    },
  });

  res.json({
    success: true,
    data: { entry },
  });
}
