import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {kaliScanAdapter,mangaJinxAdapter}=require('../backend/dist/providers/kaliscan/adapter.js');
for(const provider of [kaliScanAdapter,mangaJinxAdapter]) {
 const results=await provider.search('solo');
 const item=results.find(x=>x.sourceId==='26690-solo-max-level-newbie'); assert.ok(item);
 const details=await provider.getDetails(item.sourceId); assert.equal(details.title,'Solo Max-Level Newbie');
 const chapters=await provider.getChapters(item.sourceId); assert.ok(chapters.some(x=>x.id==='1'));
 const pages=await provider.getPages(item.sourceId,'1'); assert.ok(pages.length>1);
 for(const page of [pages[0],pages.at(-1)]) {const response=await fetch(page.imageUrl,{signal:AbortSignal.timeout(20000)});assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^image[/]/);assert.ok((await response.arrayBuffer()).byteLength>100);}
 await assert.rejects(provider.getPages(item.sourceId,'../1'),error=>error.statusCode===400);
 console.log('PASS',provider.definition.name,'search/details/chapters/pages/first+last image',chapters.length,'chapters',pages.length,'pages');
}
