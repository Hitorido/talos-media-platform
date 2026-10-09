import assert from 'node:assert/strict';
import { sourceText } from '../backend/dist/providers/shared/sourceHttp.js';
const original = globalThis.fetch;
try {
  for (const [status, code] of [
    [403, 'SOURCE_BLOCKED'],
    [429, 'SOURCE_RATE_LIMITED'],
    [404, 'UPSTREAM_FAILED'],
  ]) {
    globalThis.fetch = async () => ({ ok: false, status });
    await assert.rejects(
      sourceText('https://test.invalid', '/http-' + status),
      (e) => e.code === code && e.statusCode !== 200,
    );
  }
  for (const [cause, code] of [
    ['ENOTFOUND', 'SOURCE_DNS_FAILED'],
    ['EAI_AGAIN', 'SOURCE_DNS_FAILED'],
    ['UND_ERR_CONNECT_TIMEOUT', 'SOURCE_TIMEOUT'],
  ]) {
    globalThis.fetch = async () => {
      throw Object.assign(new Error('fetch failed'), { cause: { code: cause } });
    };
    await assert.rejects(sourceText('https://test.invalid', '/' + cause), (e) => e.code === code);
  }
  console.log('PASS blocked, rate-limited, missing, DNS and timeout failures remain distinct');
} finally {
  globalThis.fetch = original;
}
