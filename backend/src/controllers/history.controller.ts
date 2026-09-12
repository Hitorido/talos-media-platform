import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export const upsertHistorySchema = z.object({
  mediaId: z.string().min(1),
  providerId: z.string().min(1),
  sourceId: z.string().min(1),
  mediaType: z.string().min(1),
  title: z.string().min(1),
  coverUrl: z.string().min(1),
  itemId: z.string().min(1),
  itemTitle: z.string().min(1),
  itemType: z.enum(['episode', 'chapter', 'page', 'other']).or(z.string().min(1)),
  progress: z.number().min(0).max(1).default(0),
  viewedAt: z.string().datetime().optional(),
});

export async function getHistory(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const limit = Math.min(Number.parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);

  const history = await prisma.historyEntry.findMany({
    where: { userId: req.user.userId },
    orderBy: { viewedAt: 'desc' },
    take: limit,
  });

  res.json({
    success: true,
    data: { history },
  });
}

export async function addOrUpdateHistory(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const item = req.body;
  const entry = await prisma.historyEntry.create({
    data: {
      userId: req.user.userId,
      mediaId: item.mediaId,
      providerId: item.providerId,
      sourceId: item.sourceId,
      mediaType: item.mediaType,
      title: item.title,
      coverUrl: item.coverUrl,
      itemId: item.itemId,
      itemTitle: item.itemTitle,
      itemType: item.itemType,
      progress: item.progress ?? 0,
      viewedAt: item.viewedAt ? new Date(item.viewedAt) : new Date(),
    },
  });

  res.status(201).json({
    success: true,
    data: { entry },
  });
}

export async function removeHistoryItem(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { id } = req.params;
  const result = await prisma.historyEntry.deleteMany({
    where: {
      id,
      userId: req.user.userId,
    },
  });

  if (result.count === 0) {
    return res.status(404).json({ success: false, error: 'History item not found' });
  }

  res.json({
    success: true,
    message: 'History item removed',
  });
}

export async function clearHistory(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  await prisma.historyEntry.deleteMany({
    where: { userId: req.user.userId },
  });

  res.json({
    success: true,
    message: 'History cleared',
  });
}
