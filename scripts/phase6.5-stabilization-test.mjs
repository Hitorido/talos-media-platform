import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as zustand from 'zustand';
import * as middleware from 'zustand/middleware';
import {loadProviderTs} from './phase6.5-test-loader.mjs';
const routes=loadProviderTs('lib/routes.ts');
assert.equal(routes.mangaDetailsHref('mangapill__2/one-piece'),'/manga/mangapill__2%2Fone-piece');
assert.equal(routes.mangaReadHref('gdscans__sage','vol-1/ch-1-1'),'/manga/gdscans__sage/read/vol-1%2Fch-1-1');
const website=loadProviderTs('services/sourceWebsite.ts',{'@/types/provider':loadProviderTs('types/provider.ts')});
assert.equal(website.sourceWebsite('novelcodex__shadow-slave','1').url,'https://www.novelcodex.org/novel/shadow-slave/read/1');
assert.equal(website.sourceWebsite('mangapill__../../evil.invalid').url,'https://mangapill.com/');
const memory=new Map();const storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
const deps={'zustand':zustand,'zustand/middleware':middleware,'@/stores/persistStorage':{appPersistStorage:storage}};
const library=loadProviderTs('stores/libraryStore.ts',deps).useLibraryStore;
const media={id:'novelcodex__shadow-slave',title:'Shadow Slave',coverUrl:'https://test.invalid/cover',mediaType:'novel',genres:[],chapterCount:2097};
library.getState().rememberMedia(media);library.getState().addToLibrary(media.id,'novel');library.getState().saveFavorite(media.id,'novel',['Reading now']);
const restored=loadProviderTs('stores/libraryStore.ts',deps).useLibraryStore;
assert.equal(restored.getState().media[media.id].title,'Shadow Slave');
assert.ok(restored.getState().isFavorite(media.id,'novel'));assert.deepEqual(restored.getState().entries.find(e=>e.mediaId===media.id).tags,['Reading now']);
console.log('PASS encoded source/chapter routes, fixed-origin website fallback, real-source metadata/favorites/tags survive store recreation');

// Execute the actual player component and effects against a deterministic Expo player.
function loadComponent(path,dependencies){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;new Function('require','module','exports','__DEV__',code)(name=>{if(!(name in dependencies))throw Error('Unexpected import '+name);return dependencies[name]},module,module.exports,false);return module.exports.default;}
const slots=[];let cursor=0,effects=[];const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>v===b[i]);
const React={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v}]},useRef(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial})},useMemo(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={deps,value:fn()};return slots[i].value},useCallback(fn,deps){return this.useMemo(()=>fn,deps)},useEffect(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps)){const old=slots[i];slots[i]={deps,cleanup:old?.cleanup};effects.push(()=>{old?.cleanup?.();slots[i].cleanup=fn()})}}};
React.useCallback=(fn,deps)=>React.useMemo(()=>fn,deps);
const listeners={};const seeks=[];let position=42,saved=42;
const player={status:'readyToPlay',duration:1400,set currentTime(v){seeks.push(v);position=v},get currentTime(){return position},addListener(name,fn){(listeners[name]??=new Set()).add(fn);return{remove:()=>listeners[name].delete(fn)}}};
const state={getEpisodeProgress:()=>({positionSeconds:saved}),setEpisodeProgress:p=>{saved=p.positionSeconds}};
const useStore=selector=>selector(state);useStore.getState=()=>state;
const jsx=(type,props)=>({type,props});
const Player=loadComponent('app/anime/[id]/watch/[episodeId].tsx',{'react':React,'react/jsx-runtime':{jsx,jsxs:jsx},'expo-router':{Stack:{Screen:'Screen'},useRouter:()=>({back(){}}),useLocalSearchParams:()=>({id:'animeparadise__naruto',episodeId:'1'})},'expo-video':{useVideoPlayer:()=>player,VideoView:'VideoView'},'react-native':{ActivityIndicator:'Spinner',Pressable:'Button',View:'View'},'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0})},'@/components/ui':{Badge:'Badge',Text:'Text'},'@/components/content/SourceWebsiteButton':{SourceWebsiteButton:'Website'},'@/stores/animeProgressStore':{useAnimeProgressStore:useStore},'@/services/contentService':{getProviderDisplayName:()=> 'AnimeParadise',resolveAnimePlayback:async()=>({source:{url:'https://test.invalid/stream',providerId:'animeparadise',contentType:'hls'},episodeNumber:1,episodeTitle:'Episode 1',durationSeconds:1400})}});
function render(){cursor=0;Player();const pending=effects;effects=[];pending.forEach(fn=>fn())}
render();await Promise.resolve();render();assert.deepEqual(seeks,[42]);
for(const t of [43,44,45]){for(const fn of listeners.timeUpdate??[])fn({currentTime:t});render();for(const fn of listeners.statusChange??[])fn({status:'readyToPlay'});render();}
assert.deepEqual(seeks,[42],'progress saves and repeated ready events must never seek backward');assert.equal(saved,43);
slots.forEach(slot=>slot?.cleanup?.());assert.equal(saved,45,'unmount saves final observed position');
console.log('PASS actual player effects: one resume seek, progress writes do not replay seconds, final progress saved');
// Execute the real novel screen: continuous loads ahead, normal remains selected-only.
slots.length=0;cursor=0;effects=[];
const chapters=Array.from({length:2000},(_,i)=>({id:String(i+1),number:i+1,title:'Chapter '+(i+1),paragraphs:[]}));
const novel={id:media.id,title:media.title,chapters};const requested=[];
let settings={scrollMode:'continuous',theme:'dark'},progress=0;
const novelState={get settings(){return settings},getChapterProgress:()=>({scrollPercentage:progress}),setChapterProgress:p=>{progress=p.scrollPercentage},bookmarks:[],updateSettings(){},addBookmark(){},removeBookmark(){}};
const novelStore=selector=>selector(novelState);novelStore.getState=()=>novelState;
const animate=()=>({start(){}});
const Novel=loadComponent('app/novel/[id]/read/[chapterId].tsx',{'react':React,'react/jsx-runtime':{jsx,jsxs:jsx},'expo-router':{Stack:{Screen:'Screen'},useRouter:()=>({back(){}}),useLocalSearchParams:()=>({id:media.id,chapterId:'1'})},'react-native':{ActivityIndicator:'Spinner',Pressable:'Button',View:'View',Modal:'Modal',FlatList:'FlatList',Animated:{Value:class{},View:'AnimatedView',parallel:animate,timing:animate,spring:animate}},'@/components/ui':{Badge:'Badge',Text:'Text'},'@/components/content/SourceWebsiteButton':{SourceWebsiteButton:'Website'},'@/components/novel':{NovelReaderText:'Reader',NovelReaderControls:'Controls',NovelReaderHeader:'Header'},'@/hooks/useNovelContent':{useNovelContent:()=>({novel,loading:false,error:null})},'@/stores/novelProgressStore':{useNovelProgressStore:novelStore},'@/utils/cn':{cn:(...v)=>v.filter(Boolean).join(' ')},'@/services/contentService':{getProviderDisplayName:()=> 'NovelCodex.org',resolveNovelChapterContent:async(_id,ch)=>{requested.push(ch);return{chapter:{...chapters[Number(ch)-1],paragraphs:['Public text']},content:{providerId:'novelcodex'},isOffline:false,isDemo:false}}}});
let tree;function renderNovel(){cursor=0;tree=Novel();const pending=effects;effects=[];pending.forEach(fn=>fn())}
function find(node,type){if(!node)return; if(Array.isArray(node)){for(const child of node){const found=find(child,type);if(found)return found}}else if(node.type===type)return node;else return find(node.props?.children,type)}
async function settleNovel(){for(let i=0;i<8;i++){await Promise.resolve();renderNovel()}}
renderNovel();await settleNovel();assert.deepEqual(requested,['1','2','3']);assert.equal(find(tree,'Reader').props.chapters.length,3);
find(tree,'Reader').props.onChapterChange('2');renderNovel();await settleNovel();assert.deepEqual(requested,['1','2','3','4']);
find(tree,'Reader').props.onScrollProgress('2',.5,1);renderNovel();assert.equal(find(tree,'Reader').props.activeChapterId,'2','saving progress must not reset active chapter');
settings={...settings,scrollMode:'normal'};renderNovel();await settleNovel();assert.equal(find(tree,'Reader').props.chapters.length,1);
find(tree,'Controls').props.onNextChapter();renderNovel();await settleNovel();assert.equal(find(tree,'Reader').props.activeChapterId,'3');assert.equal(find(tree,'Reader').props.initialChapterId,'3');
assert.equal(find(tree,'FlatList').props.data.length,0,'closed chapter picker must not render thousands of rows');
console.log('PASS actual novel screen: seamless bounded lookahead, normal next navigation, no progress reset, closed chapter picker remains empty');

// Narou short stories and paginated serials, using the actual compiled adapter.
const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);
const narou=require('../backend/dist/providers/narou/adapter.js').narouProviderAdapter;
const originalFetch=globalThis.fetch;const calls=[];
try{globalThis.fetch=async url=>{const u=String(url);calls.push(u);let body;
 if(u.includes('novelapi'))body=JSON.stringify([{allcount:1},{ncode:u.includes('nshort')?'nshort':'nserial',title:'Novel',novel_type:u.includes('nshort')?2:1}]);
 else if(u.includes('nshort'))body='<h1 class="p-novel__title">Story</h1><div class="js-novel-text"><p>Public short story.</p></div>';
 else body=u.includes('?p=2')?'<a href="/nserial/2/" class="p-eplist__subtitle">Second</a>':'<a href="/nserial/1/" class="p-eplist__subtitle">First</a><a href="/nserial/?p=2">Next</a>';
 return new Response(body,{status:200});};
 assert.equal((await narou.getChapters('nshort'))[0].id,'oneshot');assert.equal((await narou.getNovelContent('nshort','oneshot')).paragraphs[0],'Public short story.');
 assert.deepEqual((await narou.getChapters('nserial')).map(ch=>ch.id),['1','2']);assert.ok(calls.some(url=>url.endsWith('?p=2')));
 console.log('PASS Narou one-shot content and chapter-index pagination with href-before-class markup');
}finally{globalThis.fetch=originalFetch;}
for(const [kind,storeFile,mockPath,mockFunction,builder,progressField,progressValue] of [
 ['novel','novelProgressStore','novelData','getNovelById','buildContinueReadingNovels','progressByNovel',{novelId:media.id,chapterId:'1',chapterNumber:1,chapterTitle:'Prologue',scrollPercentage:.5,updatedAt:1}],
 ['manga','mangaProgressStore','mangaData','getMangaById','buildContinueReading','progressByManga',{mangaId:'gdscans__sage-0-power',chapterId:'volume-1/ch-1-1',chapterNumber:1.1,chapterTitle:'First',pageNumber:3,totalPages:21,updatedAt:1}],
 ['anime','animeProgressStore','animeData','getAnimeById','buildContinueWatching','progressByAnime',{animeId:'animeparadise__naruto',episodeId:'1',episodeNumber:1,episodeTitle:'First',positionSeconds:45,durationSeconds:1400,updatedAt:1}]
]){
 const id=progressValue.novelId??progressValue.mangaId??progressValue.animeId;
 library.getState().rememberMedia({...media,id,mediaType:kind,title:'Real '+kind});
 const loaded=loadProviderTs('stores/'+storeFile+'.ts',{...deps,'react':{useMemo:fn=>fn()},'@/stores/libraryStore':{useLibraryStore:library},['@/services/mock/'+mockPath]:{[mockFunction]:()=>undefined}});
 assert.equal(loaded[builder]({[id]:progressValue})[0].title,'Real '+kind);
}
console.log('PASS real-source continue-reading/watching cards for comic, novel and anime without mock catalog entries');
const discovery=loadProviderTs('services/discoveryService.ts',{'@/lib/apiConfig':{getApiBaseUrl:()=> 'https://gateway.invalid'},'@/providers/mangadex/client':{},'@/types/provider':loadProviderTs('types/provider.ts'),'@/services/providerSearch':loadProviderTs('services/providerSearch.ts'),'@/stores/providerHealthStore':{useProviderHealthStore:{getState:()=>({recordSuccess(){},recordFailure(){}})}}});
let failEnglish=false;const feedCalls=[];
try{globalThis.fetch=async url=>{feedCalls.push(String(url));if(failEnglish&&String(url).includes('novelcodex'))throw Error('isolated outage');return new Response(JSON.stringify({data:{results:[{sourceId:'title',title:'Source fixture',coverUrl:'',signal:'Source signal'}]}}))};
 const enabled={novelcodex:true,narou:true};const first=discovery.getDiscovery(enabled),second=discovery.getDiscovery(enabled);assert.equal(first,second);
 const en=await first;assert.ok(feedCalls.every(url=>url.includes('novelcodex')));assert.equal(en.find(x=>x.id==='trendingNovels').items[0].providerId,'novelcodex');assert.equal(await discovery.getDiscovery(enabled),en);
 feedCalls.length=0;const ja=await discovery.getDiscovery(enabled,false,'ja');assert.ok(feedCalls.every(url=>url.includes('narou')));assert.equal(ja.find(x=>x.id==='trendingNovels').items[0].providerId,'narou');
 failEnglish=true;const mixed=await discovery.getDiscovery(enabled,true,'all');assert.equal(mixed.find(x=>x.id==='trendingNovels').items[0].providerId,'narou');assert.equal(mixed.find(x=>x.id==='trendingNovels').unavailable,false);
 assert.ok((await discovery.getDiscovery({})).every(section=>section.items.length===0));
 console.log('PASS English/Japanese discovery selection, deduplication, cache, disabled sources and isolated English feed failure');
}finally{globalThis.fetch=originalFetch;}
