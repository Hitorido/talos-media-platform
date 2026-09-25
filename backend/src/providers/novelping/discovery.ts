import { load } from 'cheerio';
import { sourceText } from '../shared/sourceHttp.js';
import { ProviderGatewayError } from '../types.js';
import { isProviderEnabled } from '../registry.js';
export async function novelPingDiscovery(feed: unknown) {
 if(feed!=='popular'&&feed!=='updated')throw new ProviderGatewayError('Invalid discovery feed.',400);
 if(!isProviderEnabled('novelping'))throw new ProviderGatewayError('NovelPing is disabled.',403,'PROVIDER_DISABLED');
 const origin='https://novelping.com', $=load(await sourceText(origin,'/'));
 const label=feed==='popular'?'Hot Novel':'Latest Release';
 const heading=$('h2').filter((_,el)=>$(el).text().trim()===label).first();
 const section=heading.parent().parent();
 const found=new Map<string,{sourceId:string;title:string;coverUrl:string;language:string;signal:string}>();
 section.find('a[href]').each((_,el)=>{
  const a=$(el),url=new URL(a.attr('href')||'/',origin),sourceId=url.origin===origin?url.pathname.match(/^\/book\/([a-z0-9-]+)$/)?.[1]:undefined;
  if(!sourceId||found.has(sourceId))return;
  const title=a.find('h3').text().trim()||a.text().trim()||a.find('img').attr('alt');if(!title)return;
  const raw=a.find('img').attr('src');
  found.set(sourceId,{sourceId,title,coverUrl:raw?new URL(raw,origin).href:'',language:'en',signal:label+' - English'});
 });
 const results=[...found.values()].slice(0,12);if(!results.length)throw new ProviderGatewayError('NovelPing feed unavailable.',502);return {results};
}
