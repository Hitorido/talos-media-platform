import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {loadProviderTs} from './phase6.5-test-loader.mjs';
const disk=new Map(),items={};let writes=0;
const deps={'@/services/persistenceService':{loadPersistedState:async key=>disk.get(key)??null,savePersistedState:async(key,value)=>{writes++;disk.set(key,structuredClone(value));}},'@/stores/downloadStore':{useDownloadStore:{getState:()=>({items})}}};
const catalog=loadProviderTs('services/offlineCatalog.ts',deps);
for(const kind of ['anime','manga','novel']){
 const detail={id:kind+'__book',title:kind+' Book',description:'Details available offline',genres:[],episodes:[{id:'1',number:1,title:'First',durationSeconds:1200,streamUrl:'temporary'}],chapters:[{id:'1',number:1,title:'First',pages:[{imageUrl:'remote'}],paragraphs:['Text'],wordCount:1}]};
 await Promise.all(Array.from({length:100},()=>catalog.saveOfflineCatalog(kind,detail)));
 const restarted=loadProviderTs('services/offlineCatalog.ts',deps);
 const saved=await restarted.loadOfflineCatalog(kind,detail.id);assert.equal(saved.title,detail.title);assert.equal(saved.description,detail.description);
 if(kind==='anime')assert.equal(saved.episodes[0].streamUrl,'');else if(kind==='manga')assert.deepEqual(saved.chapters[0].pages,[]);else assert.deepEqual(saved.chapters[0].paragraphs,[]);
}
assert.equal(writes,3,'bulk downloads save one catalog, not thousands of duplicate files');
items.old={mediaId:'old',mediaType:'novel',status:'completed',mediaTitle:'Older download',unitId:'ch1',unitNumber:1,unitTitle:'Chapter one',coverUrl:''};
assert.equal((await catalog.loadOfflineCatalog('novel','old')).chapters[0].id,'ch1');
// Run the actual hooks with an unavailable network and a saved catalog.
for(const [kind,cap] of [['manga','Manga'],['anime','Anime'],['novel','Novel']]){
 let state,effect;const local=await catalog.loadOfflineCatalog(kind,kind+'__book');
 const dependencies={'react':{useState:value=>[state??value,next=>{state=typeof next==='function'?next(state):next}],useEffect:fn=>{effect=fn}},'@/services/offlineCatalog':{loadOfflineCatalog:async()=>local},'@/stores/libraryStore':{useLibraryStore:{getState:()=>({rememberMedia(){}})}},'@/services/contentService':{['getBuiltin'+cap+'Details']:()=>null,getMediaDetails:async()=>{throw Error('Airplane mode')},getMediaChapters:async()=>{throw Error('Airplane mode')},getMediaEpisodes:async()=>{throw Error('Airplane mode')}},'@/types/provider':{encodeMediaRouteId:()=>kind+'__book'}};
 const module={exports:{}};const code=ts.transpileModule(fs.readFileSync('hooks/use'+cap+'Content.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',code)(name=>dependencies[name],module,module.exports);
 module.exports['use'+cap+'Content'](kind+'__book');effect();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(state[kind].title,local.title);assert.equal(state.loading,false);assert.equal(state.error,null);
}
console.log('PASS offline catalog persistence/restart, bulk-write deduplication, older downloads and actual detail hooks with unavailable network');
