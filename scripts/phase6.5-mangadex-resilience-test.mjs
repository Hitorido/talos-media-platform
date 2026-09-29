import assert from 'node:assert/strict';
import {loadProviderTs} from './phase6.5-test-loader.mjs';
const original=globalThis.fetch;let calls=0;
try{
 globalThis.fetch=async url=>{calls++;if(calls===1)throw new TypeError('Required SETTINGS preface');const u=new URL(url);if(u.pathname.includes('/feed')){assert.equal(u.searchParams.get('translatedLanguage[]'),'en');return new Response(JSON.stringify({data:[{id:'one',attributes:{chapter:'1',title:'First',pages:2,translatedLanguage:'en'}}],total:1}));}return new Response(JSON.stringify({data:[]}));};
 const client=loadProviderTs('providers/mangadex/client.ts');
 const [a,b]=await Promise.all([client.getMangaDexChapters('test'),client.getMangaDexChapters('test')]);assert.equal(calls,2);assert.equal(a,b);assert.equal(a.length,1);await client.getMangaDexChapters('test');assert.equal(calls,2,'reuse the catalog without another request');
 globalThis.fetch=async()=>{calls++;throw new TypeError('Network request failed')};const before=calls;await assert.rejects(client.searchMangaDex('test',12,new AbortController().signal));assert.equal(calls-before,1,'search remains cancellation-controlled without retries');
 console.log('PASS MangaDex transient GET retry, English-only feed, in-flight deduplication, catalog cache and no search retry');
}finally{globalThis.fetch=original;}
