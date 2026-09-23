import assert from 'node:assert/strict';
import {loadProviderTs} from './phase6.5-test-loader.mjs';
const base=process.env.EXPO_PUBLIC_API_URL||'http://localhost:5000';
const {getDiscovery}=loadProviderTs('services/discoveryService.ts',{
 '@/lib/apiConfig':{getApiBaseUrl:()=>base},
 '@/providers/mangadex/client':loadProviderTs('providers/mangadex/client.ts'),
 '@/types/provider':loadProviderTs('types/provider.ts'),
 '@/services/providerSearch':loadProviderTs('services/providerSearch.ts'),
 '@/stores/providerHealthStore':{useProviderHealthStore:{getState:()=>({recordSuccess(){},recordFailure(id,message){console.log('provider failure',id,message);}})}},
});
const enabled={mangadex:true,narou:true,novelcodex:true,'anilist-anime':true};
const a=getDiscovery(enabled),b=getDiscovery(enabled);assert.equal(a,b,'Concurrent calls deduplicated');const feeds=await a;
for(const feed of feeds){console.log(feed.title,feed.items.length,'items',feed.unavailable?'UNAVAILABLE':'');assert.ok(!feed.unavailable,feed.title+' failed');assert.ok(feed.items.length,feed.title+' empty');for(const item of feed.items){assert.ok(item.providerId&&item.sourceId&&item.title);assert.ok(item.id.includes(item.providerId));}}
assert.equal(await getDiscovery(enabled),feeds,'Cache reused');assert.ok((await getDiscovery({})).every(s=>s.items.length===0),'Disabled sources omitted');
const novel=feeds.find(s=>s.id==='trendingNovels').items[0];const response=await fetch(base+'/api/content/novel/'+novel.providerId+'/'+encodeURIComponent(novel.sourceId),{signal:AbortSignal.timeout(20000)});assert.equal(response.status,200,'Discovered novel details route');
const invalid=await fetch(base+'/api/content/discovery/novelcodex?feed=arbitrary');assert.equal(invalid.status,400);
console.log('PASS live discovery, source-scoped IDs, cache, deduplication, enable state, novel details and invalid-feed rejection');

const originalFetch=globalThis.fetch;
try {
 globalThis.fetch=(url,options)=>String(url).includes('graphql.anilist.co')?Promise.reject(new Error('Injected isolated outage')):originalFetch(url,options);
 const partial=await getDiscovery(enabled,true);
 assert.ok(partial.find(s=>s.id==='trendingAnime').unavailable);
 assert.ok(partial.find(s=>s.id==='trendingManga').items.length);
 assert.ok(partial.find(s=>s.id==='trendingNovels').items.length);
 console.log('PASS one discovery provider failure preserves other feeds');
}finally{globalThis.fetch=originalFetch;}
