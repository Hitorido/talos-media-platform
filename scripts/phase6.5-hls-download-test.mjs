import assert from 'node:assert/strict';
import {loadProviderTs} from './phase6.5-test-loader.mjs';
const files=[],written=[];let body='#EXTM3U\n#EXT-X-ENDLIST\n#EXTINF:5,\none.ts\n#EXTINF:5,\ntwo.ts\n';
const original=globalThis.fetch;globalThis.fetch=async()=>new Response(body);
const {downloadHls}=loadProviderTs('services/hlsDownload.ts',{'@/services/storageService':{downloadFile:async(url,path)=>{files.push({url,path});return{uri:path,size:100}},saveTextFile:async(path,text)=>written.push({path,text})}});
try{
 const result=await downloadHls('https://media.invalid/a/list.m3u8','file:///episode/',{isAborted:false},()=>{});assert.equal(result.bytes,200);assert.equal(files.length,2);assert.match(written[0].text,/segment-0.ts/);assert.doesNotMatch(written[0].text,/https:/);assert.equal(result.localPath,'file:///episode/video.m3u8');
 body='#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key"\n#EXT-X-ENDLIST\nvideo.ts';await assert.rejects(()=>downloadHls('https://media.invalid/list','file:///x/',{isAborted:false},()=>{}),/not supported/);
 body='#EXTM3U\n#EXTINF:5,\nvideo.ts';await assert.rejects(()=>downloadHls('https://media.invalid/list','file:///x/',{isAborted:false},()=>{}),/VOD/);
 assert.equal(written.length,1,'unsupported streams never produce a completed local manifest');
 console.log('PASS real HLS downloader: segment storage, relative local manifest, bytes, encrypted/live rejection');
}finally{globalThis.fetch=original;}
