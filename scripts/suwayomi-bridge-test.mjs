import assert from 'node:assert/strict';
import { suwayomiAdapter as p, suwayomiImage } from '../backend/dist/providers/suwayomi/adapter.js';
const original = fetch;
const source = '9223372036854770000';
const calls = [];
try {
  delete process.env.SUWAYOMI_URL;
  await assert.rejects(p.search('test'), (e) => e.code === 'PROVIDER_NOT_CONFIGURED');
  process.env.SUWAYOMI_URL = 'http://private.test:4567';
  process.env.SUWAYOMI_SOURCE_IDS = source;
  process.env.SUWAYOMI_AUTHORIZATION = 'Bearer fixture';
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(url).origin, 'http://private.test:4567');
    assert.equal(init.headers.Authorization, 'Bearer fixture');
    const { query, variables } = JSON.parse(init.body);
    calls.push({ query, variables });
    let data;
    if (query.includes('fetchSourceManga')) {
      assert.equal(variables.input.source, source);
      data = {
        fetchSourceManga: { mangas: [{ id: 4, sourceId: source, title: 'Comic', genre: [] }] },
      };
    } else if (query.includes('fetchMangaAndChapters')) {
      data = {
        fetchMangaAndChapters: {
          manga: { id: 4, sourceId: source, title: 'Comic', genre: [] },
          chapters: [{ id: 8, mangaId: 4, name: 'Chapter 1', chapterNumber: 1 }],
        },
      };
    } else if (query.includes('fetchChapterPages'))
      data = { fetchChapterPages: { pages: ['/api/v1/manga/4/chapter/0/page/0'] } };
    else data = { manga: { sourceId: variables.id === 999 ? 'not-enabled' : source } };
    return new Response(JSON.stringify({ data }), { status: 200 });
  };
  assert.equal((await p.search('comic'))[0].sourceId, '4');
  assert.equal((await p.getDetails('4')).title, 'Comic');
  assert.equal((await p.getChapters('4'))[0].id, '8');
  assert.match((await p.getPages('4', '8'))[0].imageUrl, /^\/api\/content\/suwayomi\/image/);
  await assert.rejects(p.getPages('4', '9'), (e) => e.statusCode === 404);
  await assert.rejects(p.getDetails('../secret'), (e) => e.statusCode === 400);
  await assert.rejects(p.getDetails('999'), (e) => e.statusCode === 403);
  assert.equal(
    calls.some((c) => c.variables.input?.id === 999),
    false,
  );
  await assert.rejects(
    suwayomiImage({ query: { path: 'https://evil.test/file' } }, {}),
    (e) => e.statusCode === 400,
  );
  globalThis.fetch = async () => new Response(JSON.stringify({ errors: [{ message: 'fixture' }] }));
  await assert.rejects(p.search('error'), (e) => e.statusCode === 502);
  console.log(
    'PASS Suwayomi configuration, long source IDs, normalized content, ownership, invalid image path and GraphQL errors',
  );
} finally {
  globalThis.fetch = original;
}
