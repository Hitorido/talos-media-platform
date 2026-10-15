import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadProviderTs } from './phase6.5-test-loader.mjs';
const require = createRequire(import.meta.url);
const platform = { OS: 'android' };
const anime = loadProviderTs('providers/backend-content/directAnime.ts', {
  'react-native': { Platform: platform },
  '../../backend/src/providers/animexin/core': require('../backend/dist/providers/animexin/core.js'),
  '../../backend/src/providers/donghuastream/core': require('../backend/dist/providers/donghuastream/core.js'),
});
const nativeText = loadProviderTs('providers/backend-content/nativeSourceText.ts');
const direct = loadProviderTs('providers/backend-content/directComic.ts', {
  'react-native': { Platform: platform },
  './nativeSourceText': nativeText,
  './directAnime': anime,
  '../../backend/src/providers/weebcentral/core': require('../backend/dist/providers/weebcentral/core.js'),
  '../../backend/src/providers/demonicscans/core': require('../backend/dist/providers/demonicscans/core.js'),
  '../../backend/src/providers/kaliscan/core': require('../backend/dist/providers/kaliscan/core.js'),
});
const calls = [];
assert.equal(
  await direct.withDirectComicFallback(
    async () => {
      calls.push('gateway');
      return 2;
    },
    async () => {
      calls.push('native');
      return 1;
    },
  ),
  1,
);
assert.deepEqual(calls, ['native']);
assert.equal(
  await direct.withDirectComicFallback(
    async () => 2,
    async () => {
      throw new Error('network');
    },
  ),
  2,
);
for (const status of [401, 404, 429])
  await assert.rejects(
    direct.withDirectComicFallback(
      async () => {
        throw Error('should not run');
      },
      async () => {
        throw Object.assign(new Error('refused'), { status });
      },
    ),
    (e) => e.status === status,
  );
const original = fetch;
try {
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(url).origin, 'https://kaliscan.io');
    assert.equal(init.redirect, 'error');
    return new Response(
      '<a href="/manga/123-title" title="Title"><img data-src="https://images.test/1.jpg"></a>',
    );
  };
  const result = await direct.directComicAdapter('kaliscan').search('title');
  assert.equal(result[0].providerId, 'kaliscan');
  assert.equal(result[0].sourceId, '123-title');
  await assert.rejects(
    nativeText.nativeSourceText('https://kaliscan.io')('https://evil.test', '/'),
  );
  platform.OS = 'web';
  assert.equal(direct.directComicAdapter('kaliscan'), undefined);
  console.log(
    'PASS native-first selection, gateway recovery, refusal/cancellation boundaries, fixed origin and actual comic parser',
  );
} finally {
  globalThis.fetch = original;
}
