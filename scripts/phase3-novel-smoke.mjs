/**
 * Phase 3 novel smoke checks (no React Native imports).
 * Run: node scripts/phase3-novel-smoke.mjs
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
  console.log('Checking novel reader uses provider resolver...');
  assertIncludes(
    'app/novel/[id]/read/[chapterId].tsx',
    ['useNovelContent', 'resolveNovelChapterContent'],
    'reader imports',
  );

  const reader = readFileSync(resolve('app/novel/[id]/read/[chapterId].tsx'), 'utf8');
  if (reader.includes("from '@/services/mock/novelData'")) {
    throw new Error('Reader still imports mock novelData directly');
  }
  console.log('  OK reader no longer imports mock novelData');

  console.log('Checking builtin novel provider implements getNovelContent...');
  assertIncludes(
    'providers/builtin-mock/index.ts',
    ['async getNovelContent', 'isDemo: true'],
    'builtin getNovelContent',
  );

  console.log('Checking novel backend provider + Express gateway...');
  assertIncludes(
    'providers/novel-backend/index.ts',
    ['novelBackendProvider', 'getNovelProviderBaseUrl', 'getNovelContent'],
    'expo novel-backend provider',
  );
  assertIncludes(
    'backend/src/routes/novel.routes.ts',
    ['/search', '/status', 'novelGatewaySearch'],
    'express novel routes',
  );
  assertIncludes(
    'services/contentService.ts',
    ['resolveNovelChapterContent', 'searchAlternateNovelSources'],
    'contentService novel resolver',
  );

  console.log('Checking Express novel status endpoint shape (if backend running)...');
  try {
    const response = await fetch('http://localhost:5000/api/novels/status');
    if (response.ok) {
      const json = await response.json();
      console.log('  OK live /api/novels/status:', json?.data?.status ?? json);
    } else {
      console.log('  NOTE backend responded HTTP', response.status);
    }
  } catch {
    console.log('  NOTE backend not running (optional for Phase 3 foundation)');
  }

  console.log('PHASE3_SMOKE_PASS');
}

main().catch((error) => {
  console.error('PHASE3_SMOKE_FAIL', error);
  process.exit(1);
});
