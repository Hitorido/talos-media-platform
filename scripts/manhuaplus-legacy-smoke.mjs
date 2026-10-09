import assert from 'node:assert/strict';
import { manhuaPlusAdapter as p } from '../backend/dist/providers/manhuaplus/adapter.js';
import { imageTarget } from '../backend/dist/media/proxy.js';
const results = await p.search('martial peak');
const id = results.find((x) => x.title === 'Martial Peak').sourceId;
const chapters = await p.getChapters(id);
const pages = await p.getPages(id, chapters[0].id);
assert.ok(pages.length);
for (const page of [pages[0], pages.at(-1)]) {
  const target = imageTarget('manhuaplus', new URL(page.imageUrl).pathname);
  assert.equal(target.url, page.imageUrl);
  const r = await fetch(target.url, {
    headers: { Referer: target.referer },
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type') || '', /^image\//);
  await r.body?.cancel();
}
assert.throws(() => imageTarget('manhuaplus', '/2023/08/07/../../secret.jpg'));
assert.throws(() => imageTarget('manhuaplus', 'https://example.com/image.jpg'));
console.log(
  'PASS ManhuaPlus',
  id,
  chapters.length,
  'chapters',
  pages.length,
  'pages, first/last legacy images and relay validation',
);
