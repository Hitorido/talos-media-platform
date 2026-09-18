import { load } from 'cheerio';
import { checkedId, sourceText } from '../shared/sourceHttp.js';
import { ProviderGatewayError, type ContentProviderAdapter } from '../types.js';
const origin = 'https://gdscans.com', providerId = 'gdscans';
const id = (value: string) => checkedId(value, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const gdScansAdapter: ContentProviderAdapter = {
 definition: { id: providerId, name: 'GdScans', mediaTypes: ['manga'], capabilities: ['search','details','chapters','pages'], status: 'limited', statusNote: 'Local public image flow verified; Render and phone validation pending.', enabledByDefault: true },
 async search(query) {
  const $ = load(await sourceText(origin, '/?s=' + encodeURIComponent(query) + '&post_type=wp-manga'));
  return $('.post-title a').toArray().flatMap(el => {
   const a=$(el), url=new URL(a.attr('href') || '/',origin), sourceId=url.pathname.match(/^\/manga\/([a-z0-9-]+)\/$/)?.[1];
   if(url.origin!==origin||!sourceId)return [];
   const img=a.closest('.row').find('img').first();
   return [{id:sourceId,sourceId,providerId,mediaType:'manga' as const,title:a.text().trim(),coverUrl:img.attr('data-src')?.trim()||img.attr('src')}];
  }).slice(0,20);
 },
 async getDetails(sourceId) {
  const $=load(await sourceText(origin,'/manga/'+id(sourceId)+'/'));const title=$('.post-title h1').text().trim();
  if(!title)throw new ProviderGatewayError('Source details unavailable.',502);
  const img=$('.summary_image img').first();
  return {providerId,sourceId,mediaType:'manga',title,coverUrl:img.attr('data-src')?.trim()||img.attr('src'),description:$('.summary__content').text().trim(),genres:$('.genres-content a').toArray().map(e=>$(e).text().trim())};
 },
 async getChapters(sourceId) {
  const prefix='/manga/'+id(sourceId)+'/';
  // This is the site's read-only chapter-list POST, not a content write.
  const $=load(await sourceText(origin,prefix+'ajax/chapters/','POST'));
  const chapters=$('.wp-manga-chapter a').toArray().flatMap(el=>{
   const a=$(el),url=new URL(a.attr('href')||'/',origin),chapterId=url.pathname.slice(prefix.length).replace(/\/$/,'');
   if(url.origin!==origin||!url.pathname.startsWith(prefix)||! /^(?:[a-z0-9-]+\/)?[a-z0-9-]+$/.test(chapterId))return [];
   const title=a.text().trim(),chapterNumber=Number(title.match(/(?:Ch\.|Chapter)\s*([0-9.]+)/i)?.[1]);
   return Number.isFinite(chapterNumber)?[{id:chapterId,providerId,mediaId:sourceId,chapterNumber,title}]:[];
  });
  if(!chapters.length)throw new ProviderGatewayError('Chapter list unavailable.',502);
  return chapters.sort((a,b)=>a.chapterNumber-b.chapterNumber);
 },
 async getPages(sourceId,chapterId) {
  id(sourceId);checkedId(chapterId,/^(?:[a-z0-9-]+\/)?[a-z0-9-]+$/);
  const $=load(await sourceText(origin,'/manga/'+sourceId+'/'+chapterId+'/'));
  const pages=$('.wp-manga-chapter-img').toArray().map(el=>($(el).attr('data-src')||$(el).attr('src')||'').trim()).filter(url=>url.startsWith(origin+'/wp-content/uploads/')).map((imageUrl,index)=>({pageNumber:index+1,imageUrl}));
  if(!pages.length)throw new ProviderGatewayError('Chapter images unavailable.',502);return pages;
 }
};
