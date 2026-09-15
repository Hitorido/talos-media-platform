import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { prisma } from './config/prisma.js';
import { ENV } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeBackendProviders } from './providers/index.js';
import { authRouter } from './routes/auth.routes.js';
import { contentRouter } from './routes/content.routes.js';
import { favoritesRouter } from './routes/favorites.routes.js';
import { historyRouter } from './routes/history.routes.js';
import { libraryRouter } from './routes/library.routes.js';
import { novelRouter } from './routes/novel.routes.js';
import { progressRouter } from './routes/progress.routes.js';
import { providersRouter } from './routes/providers.routes.js';
import { userRouter } from './routes/user.routes.js';

export function createApp() {
  initializeBackendProviders();

  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowedOrigins = ENV.CORS_ORIGIN.split(',').map((value) => value.trim());
        callback(null, allowedOrigins.includes(origin));
      },
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'manga-anime-novel-backend',
        env: ENV.NODE_ENV,
        timestamp: new Date().toISOString(),
        contentGateway: true,
      },
    });
  });

  app.get('/health/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        success: true,
        data: { status: 'ready', database: 'reachable' },
      });
    } catch {
      res.status(503).json({
        success: false,
        error: 'Database is unavailable.',
        data: { status: 'not-ready', database: 'unreachable' },
      });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/user', userRouter);
  app.use('/api/library', libraryRouter);
  app.use('/api/favorites', favoritesRouter);
  app.use('/api/history', historyRouter);
  app.use('/api/progress', progressRouter);
  app.use('/api/providers', providersRouter);
  app.use('/api/content', contentRouter);
  app.use('/api/novels', novelRouter);

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
  });

  app.use(errorHandler);

  return app;
}
