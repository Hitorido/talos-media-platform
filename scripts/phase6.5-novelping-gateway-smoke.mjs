import assert from 'node:assert/strict';
import {loadProviderTs} from './phase6.5-test-loader.mjs';
const base=process.env.API_BASE||'http://127.0.0.1:5001';
const apiRequest=async path=>{const response=await fetch(base+path,{signal:AbortSignal.timeout(25000)});const body=await response.json();if(!response.ok)throw Error('Gateway '+response.status+': '+JSON.stringify(body));return body.data;};
const bridge=loadProviderTs('providers/backend-content/index.ts',{'@/lib/apiConfig':{getApiBaseUrl:()=>base},'@/services/api/client':{apiRequest},'@/types/provider':loadProviderTs('types/provider.ts')}).backendNovelProvider('novelping','NovelPing');
for(const [query,match] of [['shadow','shadow-slave'],['lord of mysteries',null]]) {
 const results=await bridge.search(query,{filter:'novel',limit:12});const item=match?results.find(x=>x.sourceId===match):results[0];assert.ok(item);
 const ref={providerId:'novelping',sourceId:item.sourceId};const detail=await bridge.getDetails(ref),chapters=await bridge.getChapters(ref);assert.equal(detail.language,'en');assert.ok(chapters.length);
 const text=await bridge.getNovelContent(ref,chapters[0].id);assert.ok(text.paragraphs.length>3);assert.equal(text.language,'en');
 console.log('PASS actual NovelPing frontend/gateway',detail.title,chapters.length,'chapters',text.paragraphs.length,'paragraphs');
}
for(const feed of ['popular','updated']){const payload=await apiRequest('/api/content/discovery/novelping?feed='+feed);assert.ok(payload.results.length);assert.ok(payload.results.every(x=>x.language==='en'));console.log('PASS NovelPing',feed,payload.results.length,'items');}
const invalid=await fetch(base+'/api/content/discovery/novelping?feed=invalid');assert.equal(invalid.status,400);
