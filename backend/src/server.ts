import { createApp } from './app.js';
import { ENV } from './config/env.js';
import { prisma } from './config/prisma.js';

async function main() {
  await prisma.$connect();

  const app = createApp();
  app.listen(ENV.PORT, () => {
    console.log(`[backend] listening on http://localhost:${ENV.PORT}`);
    console.log(`[backend] health: http://localhost:${ENV.PORT}/health`);
  });
}

main().catch(async (error) => {
  console.error('[backend] failed to start:', error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
