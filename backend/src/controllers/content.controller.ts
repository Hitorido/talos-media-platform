import { Request, Response } from 'express';

import { contentGateway, listProviderSummaries, ProviderGatewayError } from '../providers/index.js';

function sendGatewayError(res: Response, error: unknown) {
  if (error instanceof ProviderGatewayError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
    });
    return;
  }

  const status = (error as Error & { status?: number; statusCode?: number }).statusCode
    ?? (error as Error & { status?: number }).status
    ?? 502;
  res.status(status).json({
    success: false,
    error: error instanceof Error ? error.message : 'Content gateway request failed.',
  });
}

export const contentController = {
  listProviders(_req: Request, res: Response) {
    res.json({
      success: true,
      data: {
        providers: listProviderSummaries(),
      },
    });
  },

  async search(req: Request, res: Response) {
    try {
      const mediaType = typeof req.query.mediaType === 'string' ? req.query.mediaType : 'novel';
      const query = typeof req.query.q === 'string' ? req.query.q : '';
      const providerId =
        typeof req.query.providerId === 'string' ? req.query.providerId : undefined;
      const preferredProviderId =
        typeof req.query.preferredProviderId === 'string'
          ? req.query.preferredProviderId
          : undefined;

      const result = await contentGateway.search({
        mediaType,
        query,
        providerId,
        preferredProviderId,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      sendGatewayError(res, error);
    }
  },

  async getDetails(req: Request, res: Response) {
    try {
      const media = await contentGateway.getDetails(
        req.params.mediaType,
        req.params.providerId,
        req.params.mediaId,
      );
      res.json({ success: true, data: media });
    } catch (error) {
      sendGatewayError(res, error);
    }
  },

  async getChapters(req: Request, res: Response) {
    try {
      const chapters = await contentGateway.getChapters(
        req.params.mediaType,
        req.params.providerId,
        req.params.mediaId,
      );
      res.json({ success: true, data: { chapters } });
    } catch (error) {
      sendGatewayError(res, error);
    }
  },

  async getPages(req: Request, res: Response) {
    try {
      const pages = await contentGateway.getPages(
        req.params.mediaType,
        req.params.providerId,
        req.params.mediaId,
        req.params.chapterId,
      );
      res.json({ success: true, data: { pages } });
    } catch (error) {
      sendGatewayError(res, error);
    }
  },

  async getEpisodes(req: Request, res: Response) {
    try {
      const episodes = await contentGateway.getEpisodes(
        req.params.mediaType,
        req.params.providerId,
        req.params.mediaId,
      );
      res.json({ success: true, data: { episodes } });
    } catch (error) {
      sendGatewayError(res, error);
    }
  },

  async getNovelContent(req: Request, res: Response) {
    try {
      const content = await contentGateway.getNovelContent(
        req.params.providerId,
        req.params.mediaId,
        req.params.chapterId,
      );
      res.json({ success: true, data: content });
    } catch (error) {
      sendGatewayError(res, error);
    }
  },

  async getPlayback(req: Request, res: Response) {
    try {
      const source = await contentGateway.getPlaybackSource(
        req.params.mediaType,
        req.params.providerId,
        req.params.mediaId,
        req.params.episodeId,
      );
      res.json({ success: true, data: source });
    } catch (error) {
      sendGatewayError(res, error);
    }
  },
};
