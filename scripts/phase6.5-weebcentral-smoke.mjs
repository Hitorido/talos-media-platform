import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {weebCentralAdapter: p}=require('../backend/dist/providers/weebcentral/adapter.js');
for(const query of ['One Piece','Solo Leveling']) {
 const results=await p.search(query); assert.ok(results.length,'search empty');
 const found=results[0]; console.log('search',query,found.sourceId,found.title);
 const details=await p.getDetails(found.sourceId); assert.ok(details.title);
 const chapters=await p.getChapters(found.sourceId);assert.ok(chapters.length);
 const pages=await p.getPages(found.sourceId,chapters[0].id);assert.ok(pages.length);
 const response=await fetch(pages[0].imageUrl,{signal:AbortSignal.timeout(20000)}); assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^image\//);await response.body?.cancel();
 console.log('PASS',query,'details/chapters/pages/image',chapters.length,pages.length);
}
await assert.rejects(p.getDetails('https://localhost'),e=>e.statusCode===400);
console.log('PASS rejects URL-shaped IDs');
