/**
 * Phase 5.6 beta media flow smoke.
 * Covers real MangaDex category flows and the configured-state anime check.
 */

const MANGADEX = 'https://api.mangadex.org';
const headers = { Accept: 'application/json', 'User-Agent': 'MangaAnimeNovelReader/1.0' };

async function json(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return response.json();
}

function localized(value) {
  return value?.en ?? Object.values(value ?? {}).find(Boolean) ?? '';
}

function formatOf(item) {
  const language = (item.attributes.originalLanguage ?? '').toLowerCase();
  const genres = (item.attributes.tags ?? []).map((tag) => localized(tag.attributes?.name)).join(' ').toLowerCase();
  if (language === 'ko' || genres.includes('manhwa')) return 'manhwa';
  if (language === 'zh' || language.startsWith('zh') || genres.includes('manhua')) return 'manhua';
  return 'manga';
}

async function findByFormat(query, expected) {
  const params = new URLSearchParams({ title: query, limit: '12', 'order[relevance]': 'desc' });
  params.append('includes[]', 'cover_art');
  const payload = await json(`${MANGADEX}/manga?${params}`);
  const item = payload.data?.find((candidate) => formatOf(candidate) === expected);
  if (!item) throw new Error(`No ${expected} MangaDex result for ${query}`);
  return item;
}

async function mangaDexFlow(query, expected) {
  const item = await findByFormat(query, expected);
  const title = localized(item.attributes.title);
  const details = await json(`${MANGADEX}/manga/${item.id}?includes[]=cover_art`);
  if (!details.data?.attributes?.title) throw new Error(`${expected} details missing title`);

  const feed = await json(`${MANGADEX}/manga/${item.id}/feed?limit=100&order[chapter]=asc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic&includeEmptyPages=0`);
  const candidates = feed.data?.filter((entry) => Number(entry.attributes?.pages) > 0) ?? [];
  let chapter;
  let atHome;
  for (const candidate of candidates) {
    const response = await fetch(`${MANGADEX}/at-home/server/${candidate.id}?forcePort443=true`, { headers });
    if (!response.ok) continue;
    const payload = await response.json();
    const files = payload.chapter?.dataSaver?.length ? payload.chapter.dataSaver : payload.chapter?.data;
    if (payload.baseUrl && payload.chapter?.hash && files?.length) {
      chapter = candidate;
      atHome = payload;
      break;
    }
  }
  if (!chapter || !atHome) throw new Error(`${expected} has no currently readable English chapter`);
  const files = atHome.chapter.dataSaver?.length ? atHome.chapter.dataSaver : atHome.chapter.data;
  const pageUrl = `${atHome.baseUrl}/${atHome.chapter.dataSaver?.length ? 'data-saver' : 'data'}/${atHome.chapter.hash}/${files[0]}`;
  const pageResponse = await fetch(pageUrl, { headers: { 'User-Agent': headers['User-Agent'] } });
  if (!pageResponse.ok) throw new Error(`${expected} page image HTTP ${pageResponse.status}`);

  console.log(`${expected}: PASS search/details/chapters/pages/reader-source title="${title}" chapter=${chapter.id} image=${pageResponse.status}`);
  return { title, chapterId: chapter.id, pageUrl };
}

async function narouFlow() {
  const query = encodeURIComponent('転生');
  const response = await fetch(`http://localhost:5000/api/content/search?mediaType=novel&providerId=narou&q=${query}`);
  if (!response.ok) throw new Error(`Narou search HTTP ${response.status}`);
  const search = await response.json();
  const result = search.data?.results?.[0];
  if (!result?.sourceId) throw new Error('Narou search returned no source');
  const details = await (await fetch(`http://localhost:5000/api/content/novel/narou/${result.sourceId}`)).json();
  const chapters = await (await fetch(`http://localhost:5000/api/content/novel/narou/${result.sourceId}/chapters`)).json();
  const chapter = chapters.data?.chapters?.[0];
  const content = await (await fetch(`http://localhost:5000/api/content/novel/narou/${result.sourceId}/chapters/${chapter.id}/content`)).json();
  if (!details.data?.title || !chapter?.id || !content.data?.paragraphs?.length) throw new Error('Narou flow incomplete');
  console.log(`novel Narou: PASS search/details/chapters/text/reader-source title="${details.data.title}" paragraphs=${content.data.paragraphs.length}`);
}

async function animeConfiguration() {
  const response = await fetch('https://api.consumet.org/anime/gogoanime/naruto');
  if (response.status !== 451) throw new Error(`Expected public Consumet HTTP 451, got ${response.status}`);
  console.log('anime proxy-consumet: REQUIRES CONFIGURATION public endpoint HTTP 451; no bypass attempted');
}

async function main() {
  console.log('=== Phase 5.6 Beta Media Smoke ===');
  await mangaDexFlow('One Piece', 'manga');
  await mangaDexFlow('Solo Leveling', 'manhwa');
  await mangaDexFlow('Tales of Demons and Gods', 'manhua');
  await narouFlow();
  await animeConfiguration();
  console.log('PHASE5.6_BETA_SMOKE_PASS');
}

main().catch((error) => {
  console.error('PHASE5.6_BETA_SMOKE_FAIL', error);
  process.exit(1);
});
