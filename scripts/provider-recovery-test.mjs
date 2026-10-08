import assert from 'node:assert/strict';
import { loadProviderTs } from './phase6.5-test-loader.mjs';
const { apiRequestWithWake } = loadProviderTs('services/api/client.ts', {
  '@/lib/apiConfig': { getApiBaseUrl: () => 'https://test.invalid' },
});
const original = globalThis.fetch;
try {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return {
      ok: false,
      status: 502,
      json: async () => ({ success: false, error: 'Source HTTP 403.', code: 'UPSTREAM_FAILED' }),
    };
  };
  await assert.rejects(apiRequestWithWake('/source'), (e) => e.code === 'UPSTREAM_FAILED');
  assert.equal(calls.length, 1, 'Source refusal must not trigger wake or retry');
  calls.length = 0;
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (calls.length === 1) throw new Error('offline');
    return { ok: true, status: 200, json: async () => ({ success: true, data: { ok: true } }) };
  };
  assert.deepEqual(await apiRequestWithWake('/source'), { ok: true });
  assert.deepEqual(calls, [
    'https://test.invalid/source',
    'https://test.invalid/health',
    'https://test.invalid/source',
  ]);
  console.log('PASS source failures are isolated; transport failures wake and retry once');
} finally {
  globalThis.fetch = original;
}
