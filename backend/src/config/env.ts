import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  HOST: process.env.HOST?.trim() || '0.0.0.0',
  PORT: Number.parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  JWT_SECRET: process.env.JWT_SECRET || 'media_reader_jwt_secret_dev_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN?.trim() || 'http://localhost:8081',
  /** Optional upstream novel content service (lncrawl/novel-api compatible contract). */
  NOVEL_GATEWAY_URL: process.env.NOVEL_GATEWAY_URL?.trim() || '',
  /** Optional self-hosted Consumet base URL. Public api.consumet.org is unavailable (HTTP 451). */
  CONSUMET_BASE_URL: process.env.CONSUMET_BASE_URL?.trim() || '',
  /** Optional future scraper backend base URL. */
  SCRAPER_BACKEND_URL: process.env.SCRAPER_BACKEND_URL?.trim() || '',
  /** Timeout for outbound provider requests (ms). */
  PROVIDER_REQUEST_TIMEOUT_MS: Number.parseInt(process.env.PROVIDER_REQUEST_TIMEOUT_MS || '15000', 10),
  /** Asura Scans configuration */
  ASURA_BASE_URL: process.env.ASURA_BASE_URL?.trim() || 'https://asurascans.com',
  ASURA_TIMEOUT: process.env.ASURA_TIMEOUT?.trim() || '10000',
  ASURA_RATE_LIMIT_MS: process.env.ASURA_RATE_LIMIT_MS?.trim() || '1000',
};

export function validateProductionEnvironment(): void {
  if (ENV.NODE_ENV !== 'production') return;

  if (!process.env.JWT_SECRET?.trim() || ENV.JWT_SECRET === 'media_reader_jwt_secret_dev_key_2026') {
    throw new Error('JWT_SECRET must be set to a strong non-development value in production.');
  }
  if (!ENV.CORS_ORIGIN || ENV.CORS_ORIGIN === '*') {
    throw new Error('CORS_ORIGIN must explicitly list trusted production origins.');
  }
}
