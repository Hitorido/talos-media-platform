import { downloadFile, saveTextFile } from '@/services/storageService';

async function playlist(url:string):Promise<string> {
 const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error('Playlist download failed ('+response.status+').');
 const text=await response.text();
 if(text.length>2_000_000||!text.trimStart().startsWith('#EXTM3U'))throw new Error('Invalid HLS playlist.');
 return text;
}
/** Downloads bounded, unencrypted VOD; never labels a remote playlist as an offline video. */
export async function downloadHls(url:string,directory:string,signal:{isAborted:boolean},progress:(done:number,total:number,bytes:number)=>void) {
 let text=await playlist(url),base=url;
 if(text.includes('#EXT-X-STREAM-INF:')) {
  const lines=text.split(/\r?\n/);const choices=lines.flatMap((line,i)=>line.startsWith('#EXT-X-STREAM-INF:')&&lines[i+1]&&!lines[i+1].startsWith('#')?[{height:Number(line.match(/RESOLUTION=\d+x(\d+)/)?.[1]||0),url:new URL(lines[i+1],url).href}]:[]);
  const selected=choices.filter(c=>c.height<=720).sort((a,b)=>b.height-a.height)[0]??choices.sort((a,b)=>a.height-b.height)[0];
  if(!selected)throw new Error('No downloadable HLS variant.');
  base=selected.url;text=await playlist(base);
 }
 if(!text.includes('#EXT-X-ENDLIST')||text.includes('#EXT-X-STREAM-INF'))throw new Error('Only completed VOD playlists can be downloaded.');
 if(/#EXT-X-MAP:[^\n]*BYTERANGE=/.test(text)||/#EXT-X-(?!MAP:|KEY:)[^\n]*URI=/.test(text)||/#EXT-X-KEY:(?!METHOD=NONE)/.test(text)||/#EXT-X-(?:BYTERANGE|I-FRAME|MEDIA):/.test(text))throw new Error('This stream format is not supported for offline download.');
 const files:{url:string;name:string}[]=[];
 const lines=text.split(/\r?\n/).map(line=>{
  if(line.startsWith('#EXT-X-MAP:'))return line.replace(/URI="([^"]+)"/,(_,value)=>{const name='init-'+files.length+'.mp4';files.push({url:new URL(value,base).href,name});return 'URI="'+name+'"'});
  if(!line||line.startsWith('#'))return line;
  const name='segment-'+files.length+'.ts';files.push({url:new URL(line,base).href,name});return name;
 });
 if(!files.length||files.length>2000)throw new Error('Episode exceeds the supported offline segment limit.');
 let bytes=0;
 for(let i=0;i<files.length;i++) {
  if(signal.isAborted)throw new Error('Download paused.');
  const file=files[i],parsed=new URL(file.url);if(parsed.protocol!=='https:'&&parsed.protocol!=='http:')throw new Error('Unsupported media URL.');
  const result=await downloadFile(file.url,directory+file.name);bytes+=result.size;
  if(bytes>2*1024*1024*1024)throw new Error('Episode exceeds the 2 GB download limit.');
  progress(i+1,files.length,bytes);
 }
 if(signal.isAborted)throw new Error('Download paused.');
 const localPath=directory+'video.m3u8';await saveTextFile(localPath,lines.join('\n'));
 return {localPath,bytes};
}
