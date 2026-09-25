import { getApiBaseUrl } from '@/lib/apiConfig';
import type { MediaProvider } from '@/providers/types';
import { encodeMediaRouteId } from '@/types/provider';

const origin = 'https://api.animeparadise.moe';
const providerId = 'animeparadise';
type Anime = { _id: string; link: string; title: string; synopsys?: string; genres?: string[]; posterImage?: { large?: string }; rate?: string; duration?: number };
type Episode = { uid: string; number: string; title?: string; image?: string; origin: string; streamLink?: string; subData?: {src:string;label:string;type:string}[] };
function identifier(value: string) {
  if (!/^[a-zA-Z0-9_-]{1,180}$/.test(value)) throw new Error('Invalid AnimeParadise identifier.');
  return value;
}
async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, {once:true});
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${origin}${path}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`AnimeParadise HTTP ${response.status}.`);
    const payload = await response.json() as { success: boolean; data: T };
    if (!payload.success || !payload.data) throw new Error('AnimeParadise returned no content.');
    return payload.data;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
// Resolution asks for the same title/episode list several times. Share successful metadata only.
const metadataCache = new Map<string,{expires:number;value:unknown}>();
const metadataPending = new Map<string,Promise<unknown>>();
async function metadata<T>(path:string):Promise<T> {
 const hit=metadataCache.get(path);if(hit&&hit.expires>Date.now())return hit.value as T;
 if(metadataPending.has(path))return metadataPending.get(path) as Promise<T>;
 const operation=request<T>(path).then(value=>{if(metadataCache.size>=50)metadataCache.delete(metadataCache.keys().next().value!);metadataCache.set(path,{value,expires:Date.now()+60000});return value;});
 metadataPending.set(path,operation);void operation.then(()=>metadataPending.delete(path),()=>metadataPending.delete(path));return operation;
}
const details = (sourceId: string) => metadata<Anime>(`/anime/${identifier(sourceId)}`);
export const animeParadiseProvider: MediaProvider = {
  definition: { id: providerId, name: 'AnimeParadise', website: 'https://animeparadise.moe', mediaTypes: ['anime'], capabilities: ['search','details','episodes','streaming','subtitles'], status: 'limited', statusNote: 'Direct video; supplied English WebVTT uses the content gateway. Local HLS/subtitles verified; production and phone retests pending.', executionMode: 'direct-api', health: {} },
  async search(query, context) {
    if (!['all','anime'].includes(context.filter)) return [];
    const results = await request<Anime[]>(`/search?q=${encodeURIComponent(query)}`, context.signal);
    return results.slice(0,context.limit??12).map(item=>({id:encodeMediaRouteId(providerId,item.link),providerId,sourceId:item.link,title:item.title,coverUrl:item.posterImage?.large??'',type:'anime' as const,subtitle:'AnimeParadise · playback source',tags:['AnimeParadise']}));
  },
  async getDetails(ref) {
    const item=await details(ref.sourceId);
    return {ref,mediaType:'anime',title:item.title,coverUrl:item.posterImage?.large??'',description:item.synopsys,genres:item.genres??[],rating:item.rate?Number(item.rate)/10:undefined};
  },
  async getEpisodes(ref) {
    const item=await details(ref.sourceId);
    const episodes=await metadata<Episode[]>(`/anime/${identifier(item._id)}/episode`);
    return episodes.filter(e=>e.origin===item._id).map(e=>({id:e.uid,number:Number(e.number),title:e.title??`Episode ${e.number}`,thumbnailUrl:e.image,durationSeconds:item.duration?item.duration*60:undefined}));
  },
  async getPlaybackSource(ref,episodeId) {
    const item=await details(ref.sourceId);
    const data=await request<{episode:Episode}>(`/ep/${identifier(episodeId)}?origin=${identifier(item._id)}`);
    const ep=data.episode;
    if (ep.origin!==item._id || ep.uid!==episodeId || !ep.streamLink) throw new Error('Episode playback is unavailable for this title.');
    const directUrl=`https://stream.animeparadise.moe/m3u8?url=${encodeURIComponent(ep.streamLink)}`;
    const english=ep.subData?.find(track=>track.type==='vtt'&&/^english$/i.test(track.label));
    const url=english?getApiBaseUrl()+'/api/content/animeparadise/'+identifier(ref.sourceId)+'/'+identifier(episodeId)+'/master.m3u8':directUrl;
    return {providerId,sourceId:ref.sourceId,mediaId:ref.sourceId,episodeId,url,fallbackUrl:english?directUrl:undefined,subtitles:english?[{language:'en',url:english.src}]:undefined,contentType:'hls',isDirectStream:true,isDemo:false,availability:'available',note:'AnimeParadise HLS. English subtitles are selected when supplied in the stream.'};
  },
};
