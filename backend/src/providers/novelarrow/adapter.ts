import { load } from 'cheerio';
import { checkedId, sourceText } from '../shared/sourceHttp.js';
import { ProviderGatewayError, type ContentProviderAdapter, type BackendSearchResult } from '../types.js';
const origin='https://novelarrow.com',providerId='novelarrow';
const id=(v:string)=>checkedId(v,/^[a-z0-9][a-z0-9-]{0,220}$/);
type Chapter={chapter_id:string;chapter_name:string;premium_content?:boolean;platinum_content?:boolean;coin_price?:number};
export const novelArrowAdapter:ContentProviderAdapter={
 definition:{id:providerId,name:'NovelArrow',mediaTypes:['novel'],capabilities:['search','details','chapters','textContent'],status:'limited',statusNote:'Public unlocked text works locally; Render upstream returned HTTP 403. Locked chapters rejected.',enabledByDefault:true},
 async search(query){
  const $=load(await sourceText(origin,`/novels/search?keyword=${encodeURIComponent(query)}`));const results=new Map<string,BackendSearchResult>();
  $('a[href^="/novel/"]').each((_,el)=>{const a=$(el),sourceId=a.attr('href')!.slice(7);if(!/^[a-z0-9][a-z0-9-]{0,220}$/.test(sourceId))return;const old=results.get(sourceId);const title=a.find('h2,h3').first().text().trim()||(!a.find('p').length?a.text().trim():'')||old?.title||'';results.set(sourceId,{id:sourceId,sourceId,providerId,mediaType:'novel',title,coverUrl:a.find('img').attr('src')||old?.coverUrl});});return [...results.values()].filter(x=>x.title).slice(0,20);
 },
 async getDetails(sourceId){const $=load(await sourceText(origin,`/novel/${id(sourceId)}`));const title=$('h1').first().text().trim();if(!title)throw new ProviderGatewayError('Novel details unavailable.',502);return {providerId,sourceId,mediaType:'novel',title,description:$('meta[name="description"]').attr('content'),coverUrl:$('meta[property="og:image"]').attr('content'),genres:[],language:'en'};},
 async getChapters(sourceId){const payload=JSON.parse(await sourceText(origin,`/api-web/novels/${id(sourceId)}/chapters?sort=asc`)) as {items:Chapter[]};if(!Array.isArray(payload.items))throw new ProviderGatewayError('Novel chapter list unavailable.',502);return payload.items.filter(c=>!c.premium_content&&!c.platinum_content&&!c.coin_price).map((c,i)=>({id:c.chapter_id,providerId,mediaId:sourceId,chapterNumber:Number(c.chapter_name.match(/(?:chapter\s*)?(\d+(?:\.\d+)?)/i)?.[1]??i+1),title:c.chapter_name,language:'en'}));},
 async getNovelContent(sourceId,chapterId){
  const payload=JSON.parse(await sourceText(origin,`/api-web/novels/${id(sourceId)}/chapters/${id(chapterId)}`)) as {item:{show_button_unlock?:boolean;chapterInfo:Chapter&{chapter_content:string;prevChapter?:Chapter;nextChapter?:Chapter}}};const item=payload.item, c=item?.chapterInfo;
  if(!c||item.show_button_unlock||c.premium_content||c.platinum_content||c.coin_price)throw new ProviderGatewayError('Chapter requires source access; not retrieved.',403,'CONTENT_LOCKED');
  const $=load(c.chapter_content||'');$('script,style').remove();const paragraphs=$('p').toArray().map(e=>$(e).text().trim()).filter(Boolean);if(!paragraphs.length)paragraphs.push(...$.text().split(/\n+/).map(s=>s.trim()).filter(Boolean));if(!paragraphs.length)throw new ProviderGatewayError('Chapter text unavailable.',502);
  return {providerId,mediaId:sourceId,chapterId,title:c.chapter_name,paragraphs,language:'en',previousChapterId:c.prevChapter?.chapter_id,nextChapterId:c.nextChapter?.chapter_id};
 }
};
