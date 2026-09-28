import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {loadProviderTs} from './phase6.5-test-loader.mjs';
const types=loadProviderTs('types/provider.ts');
const enabled={mangadex:true,novelping:true,fixture:true};let active=0,peak=0,calls=0,base='https://gateway.invalid';
const chapters=async()=>{active++;peak=Math.max(peak,active);calls++;await new Promise(r=>setTimeout(r,5));active--;return[{id:'a',language:'en'},{id:'b',language:'ja'},{id:'c',language:'en-US'}]};
const counts=loadProviderTs('services/englishChapterCount.ts',{'@/providers':{initializeProviders(){},providerRegistry:{get:()=>({getChapters:chapters})}},'@/stores/providerStore':{useProviderStore:{getState:()=>({enabled})}},'@/types/provider':types,'@/lib/apiConfig':{getApiBaseUrl:()=>base}});
const fetchOriginal=globalThis.fetch;
try {
 const ids=Array.from({length:7},(_,i)=>'fixture__'+i);
 assert.deepEqual(await Promise.all(ids.map(id=>counts.getEnglishChapterCount(id))),ids.map(()=>2));assert.equal(peak,2);
 await counts.getEnglishChapterCount(ids[0]);assert.equal(calls,7);
 await Promise.all([counts.getEnglishChapterCount('fixture__shared'),counts.getEnglishChapterCount('fixture__shared')]);assert.equal(calls,8);
 enabled.fixture=false;await assert.rejects(()=>counts.getEnglishChapterCount(ids[0]),/disabled/);enabled.fixture=true;
 base='https://changed.invalid';await counts.getEnglishChapterCount(ids[0]);assert.equal(calls,9);
 const hold=[counts.getEnglishChapterCount('fixture__busy1'),counts.getEnglishChapterCount('fixture__busy2')];const cancelled=new AbortController();const skipped=counts.getEnglishChapterCount('fixture__obsolete',cancelled.signal);cancelled.abort();await assert.rejects(skipped,{name:'AbortError'});await Promise.all(hold);assert.equal(calls,11,'unmounted queued card must not start a request');
 globalThis.fetch=async url=>{assert.ok(String(url).endsWith('/aggregate?translatedLanguage[]=en'));return new Response(JSON.stringify({volumes:{1:{chapters:{1:{count:3},2:{count:2}}},2:{chapters:{3:{count:1}}}}}))};
 assert.equal(await counts.getEnglishChapterCount('mangadex__title'),3,'count chapter entries, not alternate uploads');
 console.log('PASS English-only counts, duplicate-upload aggregation, shared cache/inflight, configuration invalidation, disabled sources, two-operation cap');
} finally {globalThis.fetch=fetchOriginal;}
// Native UI-thread zoom math and shared webtoon state are exercised in reader-zoom-test.
// Verify the subtitle manifest rejects caller paths and non-source subtitle/variant URLs.
const require=createRequire(import.meta.url);const transport=require('../backend/dist/providers/shared/sourceHttp.js');const originalText=transport.sourceText;
const {animeParadisePlaylist}=require('../backend/dist/providers/animeparadise/playlist.js');let hostile=false;
transport.sourceText=async(origin,path)=>path.startsWith('/anime/')?JSON.stringify({data:{_id:'origin'}}):path.startsWith('/ep/')?JSON.stringify({data:{episode:{uid:'episode',origin:'origin',streamLink:'opaque',subData:[{type:'vtt',label:'English',src:hostile?'http://127.0.0.1/private':'https://stream.animeparadise.moe/captions?url=opaque'}]}}}):path.startsWith('/captions')?'WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nHello\n':'#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000\nhttps://stream.animeparadise.moe/video.m3u8\n';
try {
 const master=await animeParadisePlaylist('title','episode','master.m3u8');assert.match(master.body,/SUBTITLES="english"/);assert.match(master.body,/LANGUAGE="en"/);
 assert.match((await animeParadisePlaylist('title','episode','english.m3u8')).body,/#EXTINF:4.000/);
 await assert.rejects(()=>animeParadisePlaylist('../bad','episode','master.m3u8'));
 await assert.rejects(()=>animeParadisePlaylist('title','episode','unknown'));
 hostile=true;await assert.rejects(()=>animeParadisePlaylist('title','episode','master.m3u8'),/origin/);
 console.log('PASS native HLS subtitle linkage and fixed-origin/path rejection');
} finally {transport.sourceText=originalText;}
