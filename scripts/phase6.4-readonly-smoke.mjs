// Read-only integration checks through the actual frontend API client.
import assert from 'node:assert/strict';
import { frontendApi } from './phase6.4-test-loader.mjs';
const { config, client, api } = frontendApi();
const request = client.apiRequest;
console.log('TARGET', config.getApiBaseUrl());
async function check(name, fn) {
  try {
    await fn();
    console.log('PASS', name);
  } catch (e) {
    console.log('FAIL', name, e.status ?? '', e.message);
    process.exitCode = 1;
  }
}
await check('health/readiness', async () => {
  assert.equal((await request('/health')).status, 'ok');
  assert.equal((await request('/health/ready')).database, 'reachable');
});
await check('missing/invalid auth rejected', async () => {
  for (const token of [null, 'invalid'])
    await assert.rejects(request('/api/auth/me', { token }), (e) => e.status === 401);
});
await check('providers', async () => {
  const data = await request('/api/content/providers');
  console.log(
    'PROVIDERS',
    JSON.stringify(data.providers.map((p) => ({ id: p.id, status: p.status, enabled: p.enabled }))),
  );
  assert.equal((await api.fetchProviderHealth()).status, 'ok');
});
await check('Narou search/details/chapters/real text', async () => {
  const data = await request(
    '/api/content/search?mediaType=novel&providerId=narou&q=' + encodeURIComponent('転生'),
  );
  const item = data.results[0];
  assert.ok(item);
  const id = encodeURIComponent(item.sourceId ?? item.id);
  const details = await request(`/api/content/novel/narou/${id}`);
  assert.ok(details.title);
  const chapters = await request(`/api/content/novel/narou/${id}/chapters`);
  assert.ok(chapters.chapters.length);
  const content = await request(
    `/api/content/novel/narou/${id}/chapters/${encodeURIComponent(chapters.chapters[0].id)}/content`,
  );
  assert.ok(content.paragraphs?.length);
  assert.notEqual(content.isDemo, true);
  console.log('NAROU real paragraphs', content.paragraphs.length);
});
