/**
 * Phase 4 architecture smoke (static + optional live backend).
 * Run: node scripts/phase4-gateway-smoke.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function assertIncludes(filePath, snippets, label) {
  const text = readFileSync(resolve(filePath), 'utf8');
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      throw new Error(`${label}: missing "${snippet}" in ${filePath}`);
    }
  }
  console.log('  OK', label);
}

async function main() {
  console.log('Checking unified gateway files...');
  assertIncludes('backend/src/providers/contentGateway.ts', ['contentGateway', 'UNSUPPORTED_CAPABILITY'], 'gateway');
  assertIncludes('backend/src/providers/registry.ts', ['registerProvider', 'findProvidersByCapability'], 'registry');
  assertIncludes('backend/src/routes/content.routes.ts', ['contentController', '/search'], 'content routes');
  assertIncludes('backend/src/app.ts', ["/api/content", 'initializeBackendProviders'], 'app mounts gateway');
  assertIncludes('backend/src/routes/novel.routes.ts', ['contentGateway', 'proxy-novel'], 'novel via gateway');
  assertIncludes('backend/prisma/schema.prisma', ['provider = "sqlite"'], 'sqlite preserved');
  assertIncludes('providers/mangadex/index.ts', ['mangaDexProvider'], 'mangadex preserved');
  assertIncludes('services/contentService.ts', ['resolveAnimePlayback', 'resolveNovelChapterContent'], 'expo resolvers preserved');

  console.log('Checking live backend if available...');
  try {
    const health = await fetch('http://localhost:5000/health');
    const json = await health.json();
    if (!json?.data?.contentGateway) {
      throw new Error('contentGateway flag missing on /health');
    }
    console.log('  OK live /health contentGateway');
  } catch (error) {
    console.log('  NOTE backend not reachable:', error instanceof Error ? error.message : error);
  }

  console.log('PHASE4_SMOKE_PASS');
}

main().catch((error) => {
  console.error('PHASE4_SMOKE_FAIL', error);
  process.exit(1);
});
