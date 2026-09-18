import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {loadProviderTs} from './phase6.5-test-loader.mjs';
const base=process.env.EXPO_PUBLIC_API_URL||'http://localhost:5000';
const selected=process.env.PHASE65_PROVIDERS?.split(',');
const included=([id])=>!selected||selected.includes(id);
const evidence={date:new Date().toISOString(),base,checks:[]};
async function record(name,run){try{const detail=await run();evidence.checks.push({name,status:'PASS',detail});console.log('PASS',name,detail||'');}catch(e){evidence.checks.push({name,status:'FAIL',error:e.message});console.log('FAIL',name,e.message);process.exitCode=1;}}
async function json(path){const r=await fetch(base+path,{signal:AbortSignal.timeout(60000)}),j=await r.json();assert.equal(r.status,200,JSON.stringify(j));return j.data??j;}
const {backendComicProvider,backendNovelProvider}=loadProviderTs('providers/backend-content/index.ts',{'@/lib/apiConfig':{getApiBaseUrl:()=>base},'@/types/provider':loadProviderTs('types/provider.ts'),'@/services/api/client':{apiRequest:json}});
for(const path of ['/health','/health/ready','/api/providers/health','/api/content/providers'])await record(path,async()=>{await json(path);return 'HTTP 200';});
for(const [id,query,sourceId,chapterId] of [['weebcentral','One Piece',null,null],['mangapill','One Piece','2/one-piece',null],['kaliscan','solo','26690-solo-max-level-newbie','1'],['mangajinx','solo','26690-solo-max-level-newbie','1'],['gdscans','sage','sage-0-power',null],['demonicscans','Nano','Nano-Machine','1']].filter(included))await record(id,async()=>{
 const p=backendComicProvider(id,id);const results=await p.search(query,{filter:'manga'});const item=sourceId?results.find(x=>x.sourceId===sourceId):results[0];assert.ok(item,'Expected search result');const ref={providerId:id,sourceId:item.sourceId};const d=await p.getDetails(ref);assert.ok(d.title);const chapters=await p.getChapters(ref);assert.ok(chapters.length);const pages=await p.getChapterPages(ref,chapterId||chapters[0].id);assert.ok(pages.length);assert.equal(pages[0].pageNumber,1);
 for(const url of [d.coverUrl,pages[0].imageUrl].filter(Boolean)){const r=await fetch(url,{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,'Image HTTP '+r.status);assert.match(r.headers.get('content-type')||'',/^image[/]/);assert.ok((await r.arrayBuffer()).byteLength>100);}
 return {title:d.title,chapters:chapters.length,pages:pages.length,flow:'frontend bridge/search/details/chapters/pages/cover+image'};
});
for(const [id,query,sourceId] of [['novelarrow','Shadow Slave','shadow-slave'],['novelcodex','gluttony','the-second-coming-of-gluttony']].filter(included))await record(id,async()=>{
 const p=backendNovelProvider(id,id);const items=await p.search(query,{filter:'novel'});assert.ok(items.some(x=>x.sourceId===sourceId),'Expected searched novel');const ref={providerId:id,sourceId};const d=await p.getDetails(ref);assert.ok(d.title);const chapters=await p.getChapters(ref);assert.ok(chapters.length);const content=await p.getNovelContent(ref,chapters[0].id);assert.ok(content.paragraphs.length>2);return {title:d.title,chapters:chapters.length,paragraphs:content.paragraphs.length,flow:'frontend bridge/search/details/chapters/text'};
});
mkdirSync('.expo/phase65-research',{recursive:true});writeFileSync('.expo/phase65-research/gateway-verification-'+(base.includes('onrender.com')?'render':'local')+'.json',JSON.stringify(evidence,null,2));
