import { Router } from 'express';
import { cineproAdapter, playbackParameters } from '../providers/CineProAdapter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const playbackRouter = Router();
playbackRouter.get(
  '/:mediaType/:tmdbId',
  asyncHandler(async (req, res) => {
    const p = playbackParameters(
      req.params.mediaType,
      req.params.tmdbId,
      req.query.season,
      req.query.episode,
    );
    res.setHeader('Cache-Control', 'no-store');
    const data = await cineproAdapter.extractPlayback(p.id, p.type, p.season, p.episode);
    res.json({ success: true, data });
  }),
);
