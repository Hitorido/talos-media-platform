import assert from 'node:assert/strict';
import {tmdbCatalog} from '../backend/dist/providers/tmdb/catalog.js';
const original=fetch;const calls=[];
process.env.TMDB_READ_ACCESS_TOKEN='fixture';
globalThis.fetch=async(url)=>{calls.push(String(url));return Response.json(String(url).includes('/genre/')?{genres:[{id:18,name:'Drama'}]}:{results:[{id:1,title:'Test',genre_ids:[18]},{id:2,title:'Adult',adult:true}]});};
let result;const res={json(data){result=data;}};
try{
 await tmdbCatalog({params:{kind:'movies'},query:{q:'A & B',feed:'popular'}},res);
 assert.ok(calls[0].includes('search/movie?query=A%20%26%20B'));
 assert.equal(result.data.items.length,1);assert.deepEqual(result.data.items[0].genres,['Drama']);
 await tmdbCatalog({params:{kind:'movies'},query:{q:'A & B',feed:'popular'}},res);assert.equal(calls.length,2);
 await tmdbCatalog({params:{kind:'tv'},query:{feed:'top_rated'}},res);assert.ok(calls[2].includes('/tv/top_rated?'));
 await assert.rejects(tmdbCatalog({params:{kind:'movies'},query:{feed:'../../bad'}},res),e=>e.statusCode===400);
 console.log('PASS TMDB search encoding, feed allowlist, source genres, adult exclusion and cache');
}finally{globalThis.fetch=original;}
