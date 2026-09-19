import assert from 'node:assert/strict';
import {loadProviderTs} from './phase6.5-test-loader.mjs';
const helpers=loadProviderTs('services/providerSearch.ts');
let active=0,peak=0;
const settled=await helpers.settleProviderSearches([0,1,2,3,4,5,6],async n=>{
 active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,5));active--;
 if(n===2)throw Error('source failed');return n;
});
assert.equal(peak,3);assert.equal(settled[2].status,'rejected');assert.equal(settled[6].value,6);
assert.ok(helpers.sameComicTitle('Solo-Leveling','SOLO LEVELING'));
assert.ok(!helpers.sameComicTitle('Solo Leveling: Ragnarok','Solo Leveling'));
assert.ok(!helpers.sameComicTitle('!!!','???'));
const calls=[],failures=[];
const make=(id,mediaTypes,titles,fail=false)=>({definition:{id,name:id,status:'working',capabilities:['search'],mediaTypes},search:async(q)=>{calls.push([id,q]);if(fail)throw Error('unavailable');return titles.map(title=>({id:id+'__'+title,providerId:id,sourceId:title,title,type:mediaTypes[0],comicFormat:'manga',coverUrl:'',subtitle:id,tags:[]}));}});
const providers=[make('comic',['manga'],['Solo Leveling','Solo Leveling: Ragnarok']),make('anime',['anime'],['Solo Leveling']),make('failed',['manga'],[],true),make('disabled',['manga'],['Solo Leveling'])];
const service=loadProviderTs('services/contentService.ts',{
 '@/services/providerSearch':helpers,
 '@/lib/apiConfig':{getApiBaseUrl:()=> 'https://test.invalid'},
 '@/stores/backendConfigStore':{useBackendConfigStore:{getState:()=>({backendUrls:{}})}},
 '@/providers':{initializeProviders(){},providerRegistry:{list:()=>providers}},
 '@/providers/builtin-mock':{},
 '@/providers/types':loadProviderTs('providers/types.ts'),
 '@/stores/providerHealthStore':{useProviderHealthStore:{getState:()=>({recordSuccess(){},recordFailure:id=>failures.push(id)})}},
 '@/stores/providerStore':{useProviderStore:{getState:()=>({enabled:{comic:true,anime:true,failed:true,disabled:false},getPreferredProvider:()=>undefined})}},
 '@/services/offlineResolver':{},'@/types/provider':{},'@/utils/comicFormat':{},
});
const manga=await service.unifiedSearch('error','manga');assert.equal(manga.results.length,2);assert.ok(calls.every(([id,q])=>id!=='anime'&&id!=='disabled'&&q==='error'));assert.ok(failures.includes('failed'));
const before=calls.length;assert.equal((await service.unifiedSearch('  ','all')).results.length,0);assert.equal(calls.length,before);
const alternate=await service.searchAlternateComicSources({title:'Solo Leveling'});assert.deepEqual(alternate.map(x=>x.title),['Solo Leveling']);
console.log('PASS bounded search, failure isolation/health, media and enabled filters, literal query, empty query, conservative source suggestions');
