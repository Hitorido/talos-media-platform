import assert from 'node:assert/strict';
import {loadProviderTs} from './phase6.5-test-loader.mjs';
const base=process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
const {backendComicProvider,backendNovelProvider}=loadProviderTs('providers/backend-content/index.ts',{
 '@/lib/apiConfig':{getApiBaseUrl:()=>base},
 '@/types/provider':loadProviderTs('types/provider.ts'),
 '@/services/api/client':{apiRequest:async path=>{const r=await fetch(base+path,{signal:AbortSignal.timeout(60000)});const j=await r.json();assert.equal(r.status,200,JSON.stringify(j));return j.data;}}
});
for(const id of ['kaliscan','mangajinx']) {
 const p=backendComicProvider(id,id),found=await p.search('solo',{filter:'manga'});
 const item=found.find(x=>x.sourceId==='26690-solo-max-level-newbie');assert.ok(item);
 const ref={providerId:id,sourceId:item.sourceId};const details=await p.getDetails(ref);assert.equal(details.ref.providerId,id);
 const chapters=await p.getChapters(ref);assert.equal(chapters.find(x=>x.id==='1').number,1);
 const pages=await p.getChapterPages(ref,'1');assert.equal(pages[0].pageNumber,1);
 const image=await fetch(pages[0].imageUrl,{signal:AbortSignal.timeout(20000)});assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/^image[/]/);await image.body?.cancel();
 console.log('PASS gateway/frontend comic reader contract',id);
}
const p=backendNovelProvider('novelcodex','NovelCodex.org');const items=await p.search('gluttony',{filter:'novel'});
const item=items.find(x=>x.sourceId==='the-second-coming-of-gluttony');assert.ok(item);
const ref={providerId:'novelcodex',sourceId:item.sourceId};const d=await p.getDetails(ref);assert.equal(d.ref.providerId,'novelcodex');
const chapters=await p.getChapters(ref);assert.equal(chapters[0].number,1);
const content=await p.getNovelContent(ref,chapters[0].id);assert.ok(content.paragraphs.length>3);
const denied=await fetch(base+'/api/content/novel/novelcodex/'+item.sourceId+'/chapters/'+(chapters.at(-1).number+1)+'/content');assert.equal(denied.status,403);
console.log('PASS gateway/frontend novel reader contract and locked chapter HTTP 403');
