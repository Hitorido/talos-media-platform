import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { cineproAdapter as adapter, playbackParameters } from '../backend/dist/providers/CineProAdapter.js';
import { playbackRouter } from '../backend/dist/routes/playback.routes.js';
const require = createRequire(new URL('../backend/package.json', import.meta.url));
const express = require('express');
const original = globalThis.fetch;
const proxy = (url, headers = {}) => '/v1/proxy?data=' + encodeURIComponent(JSON.stringify({url,headers}));
let mode = 'ok';
const calls = [];
const fixture = { sources: [{url:proxy('https://cdn.example.com/master.m3u8', {Referer:'https://video.example.com/', Authorization:'SECRET', Cookie:'SECRET'}),type:'hls',quality:'720p',provider:{name:'Fixture'}}],subtitles:[{url:proxy('https://cdn.example.com/en.vtt'),label:'English',format:'vtt'}] };
const mock = async (url, init) => {
  calls.push(String(url));
  assert.equal(init.redirect, 'error');
  if (mode === 'dns') throw Object.assign(new Error('fetch failed'), {cause:{code:'ENOTFOUND'}});
  if (mode === 'timeout') throw Object.assign(new Error('connect failed'), {cause:{code:'UND_ERR_CONNECT_TIMEOUT'}});
  if (typeof mode === 'number') return new Response('',{status:mode});
  if (mode === 'empty') return Response.json({sources:[]});
  if (mode === 'invalid') return Response.json({sources:[{url:'http://localhost:3000/private',type:'hls'}]});
  if (mode === 'malformed') return new Response('not json');
  return Response.json(fixture);
};
const app=express();app.use('/api/playback',playbackRouter);app.use((e,req,res,next)=>res.status(e.statusCode || 500).json({code:e.code}));
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
try {
  globalThis.fetch=mock;
  delete process.env.CINEPRO_EXTRACTOR_URL;
  await assert.rejects(adapter.extractPlayback('155','movie'),e=>e.statusCode===503 && e.code==='PROVIDER_NOT_CONFIGURED');
  process.env.CINEPRO_EXTRACTOR_URL='http://cinepro.internal:3000';
  for (const args of [['bad','155'],['movie','../2'],['tv','155','1junk','2'],['tv','155',['1'],'2'],['tv','155','1','0'],['movie','155','1','1']]) assert.throws(()=>playbackParameters(...args),e=>e.statusCode===400);
  const data=await adapter.extractPlayback('155','movie');
  assert.equal(calls.at(-1),'http://cinepro.internal:3000/v1/movies/155');
  assert.equal(data.streams[0].url,'https://cdn.example.com/master.m3u8');
  assert.deepEqual(data.streams[0].headers,{Referer:'https://video.example.com/'});
  assert.equal(data.subtitles[0].url,'https://cdn.example.com/en.vtt');
  assert.ok(!JSON.stringify(data).includes('internal'));
  await adapter.extractPlayback('155','tv',0,1);
  assert.ok(calls.at(-1).endsWith('/v1/tv/155/seasons/0/episodes/1'));
  const base='http://127.0.0.1:'+server.address().port;
  for (const [test,status,code] of [[403,403,'UPSTREAM_BLOCKED'],[429,429,'PLAYBACK_EXTRACTION_FAILED'],['dns',503,'DNS_FAILURE'],['timeout',504,'TIMEOUT'],['empty',404,'NO_SOURCES_AVAILABLE'],['invalid',404,'NO_SOURCES_AVAILABLE'],['malformed',502,'PLAYBACK_EXTRACTION_FAILED']]) {
    mode=test;const r=await original(base+'/api/playback/movie/155');assert.equal(r.status,status);assert.equal((await r.json()).code,code);
  }
  mode='ok';const r=await original(base+'/api/playback/movie/155');assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal((await r.json()).data.streams.length,1);
  const bad=await original(base+'/api/playback/tv/155?season=1junk&episode=2');assert.equal(bad.status,400);
  console.log('PASS CinePro OMSS paths, normalization, secret filtering, parameters, real HTTP failure statuses and no-store success');
} finally {globalThis.fetch=original;server.closeAllConnections();server.close();}
