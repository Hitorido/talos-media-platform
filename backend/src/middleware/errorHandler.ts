import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error('[Backend Error]:', err);

  const status = (err as Error & { statusCode?: number }).statusCode || 500;
  const isProduction = ENV.NODE_ENV === 'production';
  const message =
    status >= 500 && isProduction
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    error: message,
  });
}
