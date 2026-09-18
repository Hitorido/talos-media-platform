import { load } from 'cheerio';
import { checkedId, sourceText } from '../shared/sourceHttp.js';
import { ProviderGatewayError, type ContentProviderAdapter, type BackendSearchResult } from '../types.js';
const origin='https://mangapill.com', providerId='mangapill';
const id=(s:string)=>checkedId(s,/^\d+\/[a-z0-9-]+$/);
export const mangaPillAdapter: ContentProviderAdapter={
 definition:{id:providerId,name:'MangaPill',mediaTypes:['manga'],capabilities:['search','details','chapters','pages'],status:'limited',statusNote:'Manga content verified through Render; physical reader pending. Source discontinued manhwa support.',enabledByDefault:true},
 async search(query){
  const $=load(await sourceText(origin,`/search?q=${encodeURIComponent(query)}`));const results=new Map<string,BackendSearchResult>();
  $('a[href^="/manga/"]').each((_,el)=>{const a=$(el),sourceId=a.attr('href')!.slice(7);if(!/^\d+\/[a-z0-9-]+$/.test(sourceId))return;const old=results.get(sourceId);const title=a.text().trim()||old?.title||'';results.set(sourceId,{id:sourceId,sourceId,providerId,mediaType:'manga',title,coverUrl:a.find('img').attr('data-src')||old?.coverUrl});});
  return [...results.values()].filter(x=>x.title).slice(0,12);
 },
 async getDetails(sourceId){
  const $=load(await sourceText(origin,`/manga/${id(sourceId)}`));const title=$('h1').first().text().trim();if(!title)throw new ProviderGatewayError('Missing manga details.',502);
  return {providerId,sourceId,mediaType:'manga',title,coverUrl:$('img[data-src]').first().attr('data-src'),description:$('p').toArray().map(e=>$(e).text().trim()).find(t=>t.length>150),genres:[],language:'en'};
 },
 async getChapters(sourceId){
  const $=load(await sourceText(origin,`/manga/${id(sourceId)}`));const chapters=$('a[href^="/chapters/"]').toArray().map(el=>{const a=$(el);return {id:a.attr('href')!.slice(10),providerId,mediaId:sourceId,title:a.text().trim(),chapterNumber:Number(a.text().match(/[\d.]+/)?.[0]),language:'en'};}).filter(c=>Number.isFinite(c.chapterNumber));
  if(!chapters.length)throw new ProviderGatewayError('No source chapters.',502);return chapters.sort((a,b)=>a.chapterNumber-b.chapterNumber);
 },
 async getPages(sourceId,chapterId){
  id(sourceId);checkedId(chapterId,/^\d+-\d+\/[a-z0-9-]+$/);if(chapterId.split('-')[0]!==sourceId.split('/')[0])throw new ProviderGatewayError('Chapter does not belong to this manga.',400);
  const $=load(await sourceText(origin,`/chapters/${chapterId}`));const pages=$('img.js-page').toArray().map(e=>$(e).attr('data-src')).filter((u):u is string=>!!u&&u.startsWith('https://')).map((imageUrl,i)=>({pageNumber:i+1,imageUrl}));if(!pages.length)throw new ProviderGatewayError('No source pages.',502);return pages;
 }
};
