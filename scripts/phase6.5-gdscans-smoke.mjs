import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{gdScansAdapter:p}=require('../backend/dist/providers/gdscans/adapter.js');
const items=await p.search('sage');const found=items.find(x=>x.sourceId==='sage-0-power');assert.ok(found);
const details=await p.getDetails(found.sourceId);assert.ok(details.title.includes('Sage'));
const chapters=await p.getChapters(found.sourceId);assert.ok(chapters.length);
for(const chapter of [chapters[0],chapters.at(-1)]){const pages=await p.getPages(found.sourceId,chapter.id);assert.ok(pages.length);const r=await fetch(pages[0].imageUrl,{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^image[/]/);assert.ok((await r.arrayBuffer()).byteLength>100);console.log('PASS GdScans',chapter.id,pages.length,'pages and real image');}
await assert.rejects(p.getPages(found.sourceId,'../secret'),e=>e.statusCode===400);
console.log('PASS GdScans search/details/chapters/pages/images/invalid path',chapters.length,'chapters');
