import { load } from 'cheerio';
import { sourceText } from '../shared/sourceHttp.js';
import { ProviderGatewayError } from '../types.js';
import { isProviderEnabled } from '../registry.js';
export async function novelCodexDiscovery(feed: unknown) {
  if (feed !== 'popular' && feed !== 'updated') throw new ProviderGatewayError('Invalid discovery feed.', 400);
  if (!isProviderEnabled('novelcodex')) throw new ProviderGatewayError('NovelCodex is disabled.', 403, 'PROVIDER_DISABLED');
  const origin = 'https://www.novelcodex.org';
  const $ = load(await sourceText(origin, '/'));
  const label = feed === 'popular' ? 'Trending Today' : 'Latest Updates';
  const heading = $('h2').filter((_, el) => $(el).text().trim() === label).first();
  const section = heading.parents().toArray().find(el => $(el).find('a[href^="/novel/"]').length > 0);
  if (!section) throw new ProviderGatewayError('NovelCodex discovery section unavailable.', 502);
  const found = new Map<string, {sourceId:string; title:string; coverUrl:string; language:string; signal:string}>();
  $(section).find('a[href^="/novel/"]').each((_, el) => {
    const a = $(el), sourceId = a.attr('href')?.match(/^\/novel\/([a-z0-9][a-z0-9-]{0,220})$/)?.[1];
    if (!sourceId || found.has(sourceId)) return;
    const title = a.find('img').attr('alt') || a.find('p').first().text().trim() || a.text().trim();
    if (!title || /^Chapter\s+\d/i.test(title)) return;
    const raw = a.find('img').attr('src');
    const cover = raw ? new URL(raw, origin) : undefined;
    found.set(sourceId, {sourceId, title, coverUrl:cover?.protocol === 'https:' ? cover.href : '', language:'en', signal:label + ' - English'});
  });
  const results = [...found.values()].slice(0,12);
  if (!results.length) throw new ProviderGatewayError('NovelCodex discovery returned no titles.', 502);
  return {results};
}
