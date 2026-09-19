import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {loadProviderTs} from './phase6.5-test-loader.mjs';
const require=createRequire(import.meta.url),types=loadProviderTs('types/provider.ts');
const originalFetch=globalThis.fetch;
const controller=new AbortController();const context={filter:'all',limit:12,signal:controller.signal};
let requests=[],payload;
globalThis.fetch=async(url,options={})=>{requests.push({url:String(url),options});return{ok:true,json:async()=>payload};};
try{
 const setups=[
 ['anilist','aniListAnimeProvider',{data:{Page:{media:[{id:1,title:{english:'Naruto'},episodes:220}]}}}],
 ['jikan','jikanAnimeProvider',{data:[{mal_id:1,title:'Naruto',images:{jpg:{image_url:'https://test.invalid/cover'}},episodes:220,genres:[]}]}],
 ['kitsu','kitsuAnimeProvider',{data:[{id:'1',attributes:{canonicalTitle:'Naruto',episodeCount:220}}]}],
 ];
 for(const [name,exportName,data] of setups){
  const client=loadProviderTs('providers/'+name+'/client.ts');
  const p=loadProviderTs('providers/'+name+'/index.ts',{['@/providers/'+name+'/client']:client,'@/types/provider':types})[exportName];
  payload=data;requests=[];const result=await p.search('Naruto',context);assert.equal(requests.length,1);assert.equal(result[0].episodeCount,220);assert.ok(requests[0].options.signal);
  if(name==='anilist'){const q=JSON.parse(requests[0].options.body).query;assert.ok(!/description|bannerImage|stream|chapters/.test(q));data.data.Page.media[0].episodes=undefined;}
  if(name==='jikan')data.data[0].episodes=0;
  if(name==='kitsu')data.data[0].attributes.episodeCount=null;
  assert.equal((await p.search('unknown',context))[0].episodeCount,undefined);
 }
 const mdClient=loadProviderTs('providers/mangadex/client.ts');
 const md=loadProviderTs('providers/mangadex/index.ts',{'@/providers/mangadex/client':mdClient,'@/types/provider':types,'@/utils/comicFormat':loadProviderTs('utils/comicFormat.ts')}).mangaDexProvider;
 payload={data:[{id:'1',attributes:{title:{en:'One Piece'},description:{},status:'ongoing',originalLanguage:'ja',tags:[]},relationships:[]}]};requests=[];await md.search('One Piece',context);assert.equal(requests.length,1);assert.match(requests[0].url,/\/manga\?/);assert.equal(requests[0].options.signal,controller.signal);
 const anime=loadProviderTs('providers/animeparadise/index.ts',{'@/types/provider':types}).animeParadiseProvider;
 payload={success:true,data:[{_id:'1',link:'naruto',title:'Naruto'}]};requests=[];await anime.search('Naruto',context);assert.equal(requests.length,1);assert.match(requests[0].url,/\/search\?/);
 const paths=[];
 const apiRequest=async(path,options)=>{paths.push(path);if(path.includes('/search?')){assert.equal(options.signal,context.signal);return{results:[{id:'1',sourceId:'1',title:'Title',mediaType:'manga',chapterCount:552}]};}if(path.endsWith('/chapters'))return{chapters:[{id:'selected',chapterNumber:1,title:'Chapter'}]};if(path.endsWith('/pages'))return{pages:[{pageNumber:1,imageUrl:'https://cdn.readdetectiveconan.com/manga/1/1000-001.png'}]};if(path.endsWith('/content'))return{paragraphs:['Public text']};return{title:'Title',coverUrl:'',genres:[]};};
 const bridge=loadProviderTs('providers/backend-content/index.ts',{'@/lib/apiConfig':{getApiBaseUrl:()=> 'https://test.invalid'},'@/services/api/client':{apiRequest},'@/types/provider':types});
 for(const id of ['mangapill','gdscans','mangatown','kaliscan','mangajinx','weebcentral','demonicscans']){
  const p=bridge.backendComicProvider(id,id);paths.length=0;await p.search('One Piece',context);assert.equal(paths.length,1);assert.match(paths[0],/\/search\?/);
  paths.length=0;const ref={providerId:id,sourceId:'1'};await Promise.all([p.getDetails(ref),p.getChapters(ref)]);assert.equal(paths.length,2);assert.ok(!paths.some(x=>/pages|content/.test(x.split('/manga/')[1])));
  paths.length=0;await p.getChapterPages(ref,'selected');assert.equal(paths.length,1);assert.match(paths[0],/\/chapters\/selected\/pages$/);
 }
 for(const id of ['novelcodex','novelarrow']){
  const p=bridge.backendNovelProvider(id,id);paths.length=0;const result=await p.search('Title',context);assert.equal(paths.length,1);assert.equal(result[0].chapterCount,552);
  paths.length=0;await p.getNovelContent({providerId:id,sourceId:'1'},'selected');assert.deepEqual(paths,['/api/content/novel/'+id+'/1/chapters/selected/content']);
 }
 const narou=loadProviderTs('providers/narou/index.ts',{'@/services/api/client':{apiRequest},'@/types/provider':types}).narouProvider;paths.length=0;assert.equal((await narou.search('Title',context))[0].chapterCount,552);assert.equal(paths.length,1);
 // Abort reaches the actual fetch signal, not merely the state callback.
 globalThis.fetch=async(url,{signal})=>new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError')),{once:true});});
 const abort=new AbortController();const pending=md.search('cancel',{...context,signal:abort.signal});abort.abort();await assert.rejects(pending,{name:'AbortError'});
 console.log('PASS 15 provider search paths: metadata only, cheap counts/unknown omission, backend selected-content boundaries, direct abort transport');
}finally{globalThis.fetch=originalFetch;}
// MangaTown cover delivery must never turn search cards into title/chapter-list fetches.
const sourceCalls=[];
class GatewayError extends Error{constructor(message,statusCode){super(message);this.statusCode=statusCode;}}
const {mangaTownAdapter,mangaTownImageUrl}=loadProviderTs('backend/src/providers/mangatown/adapter.ts',{
 'cheerio':require('../backend/node_modules/cheerio'),
 '../types.js':{ProviderGatewayError:GatewayError},
 '../shared/sourceHttp.js':{checkedId:(id,re)=>{assert.match(id,re);return id;},sourceText:async(origin,path)=>{sourceCalls.push(path);assert.match(path,/^\/search\?/);return '<li><a class="manga_cover"><img src="https://fmcdn.mangahere.com/store/manga/123/ocover.jpg"></a><p class="title"><a href="/manga/test_title/">Test</a></p></li>';}}
});
await mangaTownAdapter.search('test');assert.equal(await mangaTownImageUrl('test_title', undefined, undefined, true),'https://fmcdn.mangahere.com/store/manga/123/ocover.jpg');assert.equal(sourceCalls.length,1);await assert.rejects(mangaTownImageUrl('unknown', undefined, undefined, true),e=>e.statusCode===404);assert.equal(sourceCalls.length,1);
console.log('PASS MangaTown search cover has no hidden details/chapter HTML request; unknown cover fails closed');
