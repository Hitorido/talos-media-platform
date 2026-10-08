import assert from 'node:assert/strict';
import { asuraScansAdapter as p } from '../backend/dist/providers/asurascans/adapter.js';
for (const query of ['solo swordmaster', 'solo farming']) {
 const results=await p.search(query);assert.ok(results.length);
 const id=results[0].sourceId;const details=await p.getDetails(id);
 const chapters=await p.getChapters(id);assert.ok(chapters.length);
 const pages=await p.getPages(id,chapters[0].id);assert.ok(pages.length);
 for(const page of [pages[0],pages.at(-1)]) {
  const r=await fetch(page.imageUrl,{signal:AbortSignal.timeout(20000)});
  assert.equal(r.status,200);assert.match(r.headers.get('content-type')||'',/^image\//);await r.body?.cancel();
 }
 console.log('PASS',details.title,chapters.length,'chapters',pages.length,'pages, first/last images');
}
await assert.rejects(p.getDetails('../secret'));
await assert.rejects(p.getPages('solo-swordmaster-bd5bdaf8','../1'));
await assert.rejects(p.getPages('solo-swordmaster-bd5bdaf8','999999'));
console.log('PASS invalid identifiers and unlisted chapters rejected');
