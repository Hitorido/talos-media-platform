import { createApp } from './app.js';
import { ENV, validateProductionEnvironment } from './config/env.js';
import { prisma } from './config/prisma.js';

async function main() {
  validateProductionEnvironment();
  await prisma.$connect();

  const app = createApp();
  const server = app.listen(ENV.PORT, ENV.HOST, () => {
    console.log(`[backend] listening on ${ENV.HOST}:${ENV.PORT}`);
    console.log(`[backend] health: http://${ENV.HOST}:${ENV.PORT}/health`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[backend] ${signal} received, shutting down.`);
    server.close(async () => {
      await prisma.$disconnect().catch(() => undefined);
      process.exit(0);
    });
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

main().catch(async (error) => {
  console.error('[backend] failed to start:', error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
