import { sourceText } from '../shared/sourceHttp.js';
import { ProviderGatewayError } from '../types.js';
import { isProviderEnabled, recordProviderSuccess, recordProviderFailure } from '../registry.js';

export async function narouDiscovery(feed: unknown) {
  if (feed !== 'popular' && feed !== 'updated') throw new ProviderGatewayError('Invalid discovery feed.',400);
  if (!isProviderEnabled('narou')) throw new ProviderGatewayError('Narou is disabled.',403,'PROVIDER_DISABLED');
  const start=Date.now();
  try {
    const order=feed==='popular'?'weeklypoint':'new';
    const data=JSON.parse(await sourceText('https://api.syosetu.com','/novelapi/api/?out=json&lim=12&order='+order));
    if(!Array.isArray(data))throw new ProviderGatewayError('Narou discovery unavailable.',502);
    const results=data.filter(item=>typeof item.ncode==='string'&&typeof item.title==='string').map(item=>({
      id:item.ncode.toLowerCase(),sourceId:item.ncode.toLowerCase(),providerId:'narou',mediaType:'novel',title:item.title,author:item.writer,
      signal:feed==='popular'?'Weekly reader points':'Recently updated',updatedAt:item.general_lastup,
    }));
    recordProviderSuccess('narou',Date.now()-start);return {results};
  }catch(error){recordProviderFailure('narou',error instanceof Error?error.message:'Discovery failed',Date.now()-start);throw error;}
}
