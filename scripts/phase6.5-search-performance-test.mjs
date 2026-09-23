import assert from 'node:assert/strict';
import {loadProviderTs} from './phase6.5-test-loader.mjs';
const helpers=loadProviderTs('services/providerSearch.ts');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const item=(id,title='Naruto')=>({id,providerId:id,sourceId:id,title,coverUrl:'',type:'anime',subtitle:id,tags:[]});
let active=0,peak=0,calls=0,base='https://one.invalid';
const enabled={fast:true,slow:true,broken:true};
const providers=[['fast',5],['slow',90],['broken',10]].map(([id,delay])=>({definition:{id,name:id,status:'working',mediaTypes:['anime'],capabilities:['search']},async search(q,{signal}){calls++;active++;peak=Math.max(peak,active);try{await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,delay);signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));},{once:true});});if(id==='broken')throw Error('unavailable');return Array.from({length:30},(_,n)=>item(id,q+n));}finally{active--;}}}));
const failures=[];
const service=loadProviderTs('services/contentService.ts',{
 '@/utils/novelLanguage':loadProviderTs('utils/novelLanguage.ts'),
 '@/services/providerSearch':helpers,'@/lib/apiConfig':{getApiBaseUrl:()=>base},
 '@/stores/backendConfigStore':{useBackendConfigStore:{getState:()=>({backendUrls:{}})}},
 '@/providers':{initializeProviders(){},providerRegistry:{list:()=>providers,get:id=>providers.find(p=>p.definition.id===id)}},
 '@/providers/builtin-mock':{},'@/providers/types':loadProviderTs('providers/types.ts'),
 '@/stores/providerHealthStore':{useProviderHealthStore:{getState:()=>({recordSuccess(){},recordFailure:id=>failures.push(id)})}},
 '@/stores/providerStore':{useProviderStore:{getState:()=>({enabled,getPreferredProvider:()=>undefined})}},
 '@/services/offlineResolver':{},'@/types/provider':{},'@/utils/comicFormat':{},
});
let first,finished=false;const start=Date.now();
const job=service.unifiedSearch('Naruto','anime',{onProgress:items=>{if(!first){first=Date.now()-start;assert.equal(finished,false);assert.equal(items.length,12);assert.ok(items.every(i=>i.providerId==='fast'));}}});
const result=await job;finished=true;assert.equal(result.results.length,24);assert.ok(first<Date.now()-start);assert.ok(failures.includes('broken'));
const before=calls;await service.unifiedSearch('Naruto','anime');assert.equal(calls-before,1,'only failed source retried; successful lightweight results cached');
base='https://two.invalid';const prior=calls;await service.unifiedSearch('Naruto','anime');assert.equal(calls-prior,3,'backend setting invalidates cache');
enabled.fast=false;assert.ok((await service.unifiedSearch('Naruto','anime')).results.every(x=>x.providerId!=='fast'));enabled.fast=true;
let obsoleteUpdates=0;const abort=new AbortController();const old=service.unifiedSearch('one','anime',{signal:abort.signal,onProgress:()=>obsoleteUpdates++});
const next=service.unifiedSearch('one piece','anime');abort.abort();await Promise.all([old,next]);assert.equal(obsoleteUpdates,0);assert.ok(peak<=3);assert.ok(!failures.includes('fast'));
console.log('PASS progressive first result '+first+'ms vs 90ms slow provider; global concurrency <=3, stale cancellation, result limit, cache/config invalidation, failure isolation');

// Exercise the actual hook, including the debounce interval before the next request starts.
const realSetTimeout=globalThis.setTimeout,realClearTimeout=globalThis.clearTimeout;
let timerId=0;const timers=new Map();globalThis.setTimeout=fn=>{timers.set(++timerId,fn);return timerId;};globalThis.clearTimeout=id=>timers.delete(id);
const slots=[];let cursor=0,pendingEffects=[],view;const same=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>x===b[i]);
const React={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useRef(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial});},useCallback(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={deps,fn};return slots[i].fn;},useEffect(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps)){const previous=slots[i];slots[i]={deps,cleanup:previous?.cleanup};pendingEffects.push(()=>{previous?.cleanup?.();slots[i].cleanup=fn();});}}};
const jobs=[],history=[];const state={searchHistory:[],addSearchHistory:q=>history.push(q),removeSearchHistory(){},clearSearchHistory(){}};
const {useSearch}=loadProviderTs('hooks/useSearch.ts',{'@/stores/novelPreferencesStore':{useNovelPreferencesStore:selector=>selector({language:'en'})},'react':React,'expo-router':{useLocalSearchParams:()=>({})},'@/stores/settingsStore':{useSettingsStore:selector=>selector(state)},'@/services/contentService':{unifiedSearch:(q,f,options)=>new Promise(resolve=>jobs.push({q,options,resolve}))}});
const render=()=>{cursor=0;view=useSearch();const effects=pendingEffects;pendingEffects=[];effects.forEach(fn=>fn());};
const tick=()=>{const jobs=[...timers.values()];timers.clear();jobs.forEach(fn=>fn());};
try{
 render();view.setQuery('one');render();tick();assert.equal(jobs.length,1);
 view.setQuery('one piece');render();assert.ok(jobs[0].options.signal.aborted);
 jobs[0].options.onProgress([item('stale')]);jobs[0].resolve({results:[item('stale')]});await Promise.resolve();render();assert.equal(view.results.length,0);
 view.retry();assert.equal(jobs.length,2);assert.equal(jobs[1].q,'one piece');tick();assert.equal(jobs.length,2,'submit cancels debounce');
 jobs[1].options.onProgress([item('fresh')]);render();assert.equal(view.results[0].id,'fresh');assert.ok(view.loading);
 view.clearQuery();render();jobs[1].resolve({results:[item('late')]});await Promise.resolve();render();assert.equal(view.results.length,0);assert.equal(view.loading,false);
 view.setQuery('Naruto');render();tick();const last=jobs.at(-1);slots.forEach(slot=>slot?.cleanup?.());assert.ok(last.options.signal.aborted);last.resolve({results:[]});await Promise.resolve();
 assert.equal(history.length,0,'cancelled searches do not enter history');
 console.log('PASS real hook stale progress/final suppression, clear, immediate submit, debounce cancellation, unmount');
}finally{globalThis.setTimeout=realSetTimeout;globalThis.clearTimeout=realClearTimeout;}
