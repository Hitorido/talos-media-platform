import assert from 'node:assert/strict';
import {loadProviderTs} from './phase6.5-test-loader.mjs';
const base='http://localhost:5000';
const {backendComicProvider}=loadProviderTs('providers/backend-content/index.ts',{'@/lib/apiConfig':{getApiBaseUrl:()=>base},'@/types/provider':loadProviderTs('types/provider.ts'),'@/services/api/client':{apiRequest:async path=>{const r=await fetch(base+path);const j=await r.json();assert.equal(r.status,200);return j.data;}}});
const p=backendComicProvider('mangapill','MangaPill');const result=(await p.search('One Piece',{filter:'manga'}))[0];assert.ok(result);const ref={providerId:'mangapill',sourceId:result.sourceId};const d=await p.getDetails(ref);const c=await p.getChapters(ref);const pages=await p.getChapterPages(ref,c[0].id);
for(const url of [d.coverUrl,pages[0].imageUrl]){const r=await fetch(url);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^image\//);await r.body?.cancel();}
for(const path of ['https://localhost/secret','/file/mangap/../../secret','//evil.invalid/test','/file/mangap/2/1/1.jpg?url=http://localhost']){const r=await fetch(base+'/api/content/mangapill/image?path='+encodeURIComponent(path));assert.equal(r.status,400);}
console.log('PASS frontend reader normalization, relay cover/page images, rejected arbitrary URL/path input');
