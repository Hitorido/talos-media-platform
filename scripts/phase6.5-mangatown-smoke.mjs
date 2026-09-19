import assert from 'node:assert/strict';
import {loadProviderTs} from './phase6.5-test-loader.mjs';
const base=process.env.EXPO_PUBLIC_API_URL||'http://localhost:5000';
const {backendComicProvider}=loadProviderTs('providers/backend-content/index.ts',{
 '@/lib/apiConfig':{getApiBaseUrl:()=>base},'@/types/provider':loadProviderTs('types/provider.ts'),
 '@/services/api/client':{apiRequest:async path=>{const r=await fetch(base+path,{signal:AbortSignal.timeout(60000)}),j=await r.json();assert.equal(r.status,200,JSON.stringify(j));return j.data;}}
});
const p=backendComicProvider('mangatown','MangaTown');const items=await p.search('Koi wa Amaagari',{filter:'manga'});const item=items.find(x=>x.sourceId==='koi_wa_amaagari_no_you_ni');assert.ok(item);
const searchCover=await fetch(item.coverUrl,{signal:AbortSignal.timeout(60000)});assert.equal(searchCover.status,200);assert.match(searchCover.headers.get('content-type'),/^image[/]/);await searchCover.arrayBuffer();console.log('PASS search cover before details');
const ref={providerId:'mangatown',sourceId:item.sourceId};const details=await p.getDetails(ref);assert.equal(details.title,'Koi wa Amaagari no You ni');const chapters=await p.getChapters(ref);assert.ok(chapters.some(c=>c.id==='c001'));
const pages=await p.getChapterPages(ref,'c001');assert.equal(pages.length,29);assert.deepEqual(pages.map(p=>p.pageNumber),Array.from({length:29},(_,i)=>i+1));
for(const [label,url] of [['cover',details.coverUrl],['first',pages[0].imageUrl],['middle',pages[14].imageUrl],['last',pages.at(-1).imageUrl]]){assert.ok(url.startsWith(base+'/api/content/mangatown/image?'));const r=await fetch(url,{signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,label);assert.match(r.headers.get('content-type'),/^image[/]/);assert.equal(r.headers.get('cross-origin-resource-policy'),'cross-origin');assert.ok((await r.arrayBuffer()).byteLength>100);console.log('PASS MangaTown image',label);}
for(const query of ['mediaId=../secret','mediaId=koi_wa_amaagari_no_you_ni&url=https://example.com','mediaId=koi_wa_amaagari_no_you_ni&chapterId=c001&page=301','mediaId=koi_wa_amaagari_no_you_ni&page=2','mediaId=https://localhost','mediaId=koi_wa_amaagari_no_you_ni&search=2','mediaId=koi_wa_amaagari_no_you_ni&chapterId=c001&page=1&search=1']){const r=await fetch(base+'/api/content/mangatown/image?'+query);assert.equal(r.status,400);}
const missing=await fetch(base+'/api/content/mangatown/image?mediaId=koi_wa_amaagari_no_you_ni&chapterId=c001&page=30');assert.equal(missing.status,404);
console.log('PASS MangaTown search/details/chapters/29-page list/real images/reader bridge/invalid image inputs');
