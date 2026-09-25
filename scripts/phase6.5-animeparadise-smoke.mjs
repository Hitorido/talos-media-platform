import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { loadProviderTs } from './phase6.5-test-loader.mjs';
const types=loadProviderTs('types/provider.ts');
const {animeParadiseProvider:p}=loadProviderTs('providers/animeparadise/index.ts',{'@/types/provider':types,'@/lib/apiConfig':{getApiBaseUrl:()=>process.env.API_BASE||'http://127.0.0.1:5001'}});
const results=await p.search('Naruto',{filter:'anime',limit:30});
const found=results.find(x=>x.sourceId==='naruto');assert.ok(found);
const ref={providerId:p.definition.id,sourceId:found.sourceId};
const details=await p.getDetails(ref);assert.equal(details.title,'Naruto');
const episodes=await p.getEpisodes(ref);assert.ok(episodes.length);
const source=await p.getPlaybackSource(ref,episodes[0].id);assert.equal(source.isDemo,false);assert.equal(source.contentType,'hls');
const master=await fetch(source.url,{signal:AbortSignal.timeout(20000)});assert.equal(master.status,200);const text=await master.text();assert.ok(text.startsWith('#EXTM3U'));
const variant=new URL(text.split(/\r?\n/).find(x=>x&&!x.startsWith('#')),source.url);
const response=await fetch(variant,{signal:AbortSignal.timeout(20000)});assert.equal(response.status,200);const playlist=await response.text();assert.ok(playlist.startsWith('#EXTM3U'));
const segment=new URL(playlist.split(/\r?\n/).find(x=>x&&!x.startsWith('#')),variant);
const media=await fetch(segment,{signal:AbortSignal.timeout(20000)});assert.equal(media.status,200);await media.body?.cancel();
console.log('PASS actual provider search/details/episodes/HLS/segment',episodes.length,'episodes');
if(process.argv.includes('--ffprobe')){
 const probe=spawnSync('ffprobe',['-v','quiet','-allowed_extensions','ALL','-allowed_segment_extensions','ALL','-extension_picky','0','-show_entries','stream=codec_name,codec_type:format=duration','-of','json',source.url],{timeout:45000,encoding:'utf8',windowsHide:true});
 assert.equal(probe.status,0,'ffprobe failed (URL suppressed)'); const data=JSON.parse(probe.stdout);assert.ok(data.streams.some(s=>s.codec_type==='video'));assert.ok(data.streams.some(s=>s.codec_type==='audio'));console.log('PASS decoded media metadata',data.streams.map(s=>s.codec_name).join(','),'duration',data.format.duration);
}
console.log('Physical Android expo-video rendering still requires device verification.');
