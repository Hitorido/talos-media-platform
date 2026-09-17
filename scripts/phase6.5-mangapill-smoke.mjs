import assert from 'node:assert/strict';
import {createRequire} from 'node:module';const require=createRequire(import.meta.url);
const {mangaPillAdapter:p}=require('../backend/dist/providers/mangapill/adapter.js');
for(const query of ['One Piece','Naruto']){const results=await p.search(query);assert.ok(results.length);const ref=results[0].sourceId;assert.ok((await p.getDetails(ref)).title);const chapters=await p.getChapters(ref);const pages=await p.getPages(ref,chapters[0].id);const r=await fetch(pages[0].imageUrl,{headers:{Referer:"https://mangapill.com/"},signal:AbortSignal.timeout(20000)});assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^image\//);await r.body?.cancel();console.log('PASS MangaPill',query,chapters.length,'chapters',pages.length,'pages/image');}
