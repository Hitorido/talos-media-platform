import type { NovelLanguage } from '@/utils/novelLanguage';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { mapMangaDexToNormalized, type MangaDexManga } from '@/providers/mangadex/client';
import { encodeMediaRouteId } from '@/types/provider';
import type { BaseContent } from '@/types/content';
import { settleProviderSearches } from '@/services/providerSearch';
import { useProviderHealthStore } from '@/stores/providerHealthStore';

export type DiscoveryItem = BaseContent & { providerId: string; sourceId: string; sourceName: string; signal: string };
export type DiscoverySection = { id: string; title: string; items: DiscoveryItem[]; unavailable?: boolean };
const sections = [
 ['recommendations','Recommendations'],['recentManga','Recently Updated Manga'],['recentNovels','Recently Updated Novels'],
 ['recentAnime','Recently Updated Anime'],['trendingManga','Trending Manga'],['trendingNovels','Trending Novels'],['trendingAnime','Trending Anime'],
];
export const emptyDiscovery = (): DiscoverySection[] => sections.map(([id,title])=>({id,title,items:[]}));
async function request<T>(url:string,init:RequestInit={}):Promise<T>{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{const response=await fetch(url,{...init,signal:controller.signal});if(!response.ok)throw new Error('Discovery HTTP '+response.status);return await response.json() as T;}finally{clearTimeout(timer);}
}
function unique(items:DiscoveryItem[]){return [...new Map(items.map(item=>[item.providerId+':'+item.sourceId,item])).values()].slice(0,12);}
const cache=new Map<string,{expires:number;value:DiscoverySection[]}>();
const pending=new Map<string,Promise<DiscoverySection[]>>();
type Anime={id:number;isAdult?:boolean;title:{english?:string;romaji?:string};coverImage?:{large?:string}};
const animeFields='id isAdult title { english romaji } coverImage { large }';
const animeQuery='query { trending: Page(perPage: 12) { media(type: ANIME, sort: TRENDING_DESC, isAdult: false) { '+animeFields+' } } recent: Page(perPage: 20) { airingSchedules(notYetAired: false, sort: TIME_DESC) { airingAt episode media { '+animeFields+' } } } seed: Media(type: ANIME, sort: TRENDING_DESC, isAdult: false) { title { romaji } recommendations(perPage: 12, sort: RATING_DESC) { nodes { mediaRecommendation { '+animeFields+' } } } } }';
function animeItem(media:Anime,signal:string):DiscoveryItem[]{return media&&!media.isAdult?[{id:encodeMediaRouteId('anilist-anime',String(media.id)),sourceId:String(media.id),providerId:'anilist-anime',sourceName:'AniList',title:media.title.english||media.title.romaji||'Untitled',coverUrl:media.coverImage?.large||'',type:'anime',signal}]:[];}

/** Bounded selected feed operations; never query every installed source. */
export function getDiscovery(enabled:Record<string,boolean>, refresh=false, novelLanguage:NovelLanguage='en'):Promise<DiscoverySection[]>{
 const key=getApiBaseUrl()+'|'+novelLanguage+'|'+['mangadex','narou','novelcodex','anilist-anime'].filter(id=>enabled[id]).join(',');
 if(refresh)cache.delete(key);
 const hit=cache.get(key);if(hit&&hit.expires>Date.now())return Promise.resolve(hit.value);
 if(pending.has(key))return pending.get(key)!;
 const operation=(async()=>{
  const output=emptyDiscovery();
  const set=(id:string,items:DiscoveryItem[])=>{const section=output.find(section=>section.id===id)!;section.items=unique([...section.items,...items].sort((a,b)=>Number(a.providerId==='narou')-Number(b.providerId==='narou')));};
  const jobs:{providerId:string;sections:string[];run:()=>Promise<void>}[]=[];
  if(enabled.mangadex)for(const [section,order,signal] of [['trendingManga','followedCount','Follower popularity'],['recentManga','latestUploadedChapter','Latest chapter uploads']])jobs.push({providerId:'mangadex',sections:[section],run:async()=>{
    const params=new URLSearchParams({limit:'12','includes[]':'cover_art',['order['+order+']']:'desc','contentRating[]':'safe'});
    const data=await request<{data:MangaDexManga[]}>('https://api.mangadex.org/manga?'+params);
    set(section,data.data.map(media=>{const normalized=mapMangaDexToNormalized(media);return {id:encodeMediaRouteId('mangadex',media.id),sourceId:media.id,providerId:'mangadex',sourceName:'MangaDex',title:normalized.title,coverUrl:normalized.coverUrl,type:'manga',signal};}));
  }});
  if(enabled.novelcodex && novelLanguage !== 'ja')for(const [section,feed] of [['trendingNovels','popular'],['recentNovels','updated']])jobs.push({providerId:'novelcodex',sections:[section],run:async()=>{
    const data=await request<{data:{results:{sourceId:string;title:string;coverUrl:string;signal:string}[]}}>(getApiBaseUrl()+'/api/content/discovery/novelcodex?feed='+feed);
    set(section,data.data.results.map(item=>({id:encodeMediaRouteId('novelcodex',item.sourceId),sourceId:item.sourceId,providerId:'novelcodex',sourceName:'NovelCodex.org',title:item.title,coverUrl:item.coverUrl,type:'novel',signal:item.signal})));
  }});
  if(enabled.narou && novelLanguage !== 'en')for(const [section,feed] of [['trendingNovels','popular'],['recentNovels','updated']])jobs.push({providerId:'narou',sections:[section],run:async()=>{
    const data=await request<{data:{results:{sourceId:string;title:string;signal:string}[]}}>(getApiBaseUrl()+'/api/content/discovery/narou?feed='+feed);
    set(section,data.data.results.map(item=>({id:encodeMediaRouteId('narou',item.sourceId),sourceId:item.sourceId,providerId:'narou',sourceName:'Narou',title:item.title,coverUrl:'',type:'novel',signal:item.signal+' - Japanese'})));
  }});
  if(enabled['anilist-anime'])jobs.push({providerId:'anilist-anime',sections:['trendingAnime','recentAnime','recommendations'],run:async()=>{
    const payload=await request<{errors?:{message:string}[];data:{trending:{media:Anime[]};recent:{airingSchedules:{episode:number;media:Anime}[]};seed:{title:{romaji:string};recommendations:{nodes:{mediaRecommendation:Anime}[]}}}}>('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:animeQuery})});
    if(payload.errors?.length)throw new Error(payload.errors[0].message);
    const data=payload.data;set('trendingAnime',data.trending.media.flatMap(media=>animeItem(media,'Trending')));
    set('recentAnime',data.recent.airingSchedules.flatMap(entry=>animeItem(entry.media,'Recently aired - Episode '+entry.episode)));
    set('recommendations',data.seed?.recommendations.nodes.flatMap(entry=>animeItem(entry.mediaRecommendation,'Related to '+data.seed.title.romaji))||[]);
  }});
  await settleProviderSearches(jobs,async job=>{const start=Date.now();try{await job.run();useProviderHealthStore.getState().recordSuccess(job.providerId,Date.now()-start);}catch(error){for(const id of job.sections)output.find(section=>section.id===id)!.unavailable=true;useProviderHealthStore.getState().recordFailure(job.providerId,error instanceof Error?error.message:'Discovery unavailable',Date.now()-start);}});
  for(const section of output)if(section.items.length)section.unavailable=false;
  if(cache.size>=4)cache.delete(cache.keys().next().value!);cache.set(key,{expires:Date.now()+120000,value:output});return output;
 })();pending.set(key,operation);void operation.then(()=>pending.delete(key),()=>pending.delete(key));return operation;
}
