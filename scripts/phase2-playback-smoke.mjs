/**
 * Phase 2 smoke checks that do not import React Native.
 * Run: node scripts/phase2-playback-smoke.mjs
 */

const DEMO_STREAMS = [
  'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  'https://test-streams.mux.dev/test_001/stream.m3u8',
  'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8',
  'https://media.w3.org/2010/05/sintel/trailer.mp4',
];

async function assertReachable(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: { Range: 'bytes=0-32' },
  });
  if (!response.ok && response.status !== 206) {
    throw new Error(`${url} -> HTTP ${response.status}`);
  }
  return response.status;
}

async function main() {
  console.log('Checking demo streams...');
  for (const url of DEMO_STREAMS) {
    const status = await assertReachable(url);
    console.log('  OK', status, new URL(url).host);
  }

  console.log('Checking public Consumet anime endpoint...');
  const consumet = await fetch('https://api.consumet.org/anime/gogoanime/naruto');
  if (consumet.status !== 451) {
    console.log('  NOTE unexpected status', consumet.status, '(expected 451)');
  } else {
    console.log('  OK public Consumet still HTTP 451 (unavailable)');
  }

  console.log('Checking Jikan metadata...');
  const jikan = await fetch('https://api.jikan.moe/v4/anime/1');
  if (!jikan.ok) throw new Error(`Jikan failed: HTTP ${jikan.status}`);
  const jikanJson = await jikan.json();
  console.log('  OK Jikan metadata:', jikanJson?.data?.title);

  console.log('Checking Kitsu metadata...');
  const kitsu = await fetch('https://kitsu.io/api/edge/anime?filter[text]=naruto&page[limit]=1');
  if (!kitsu.ok) throw new Error(`Kitsu failed: HTTP ${kitsu.status}`);
  const kitsuJson = await kitsu.json();
  console.log('  OK Kitsu metadata:', kitsuJson?.data?.[0]?.attributes?.canonicalTitle);

  console.log('Checking AniList metadata GraphQL (may be blocked from bare Node)...');
  const anilist = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'MangaAnimeNovelReader/1.0',
    },
    body: JSON.stringify({
      query: 'query ($id: Int) { Media(id: $id, type: ANIME) { id title { romaji } } }',
      variables: { id: 21 },
    }),
  });
  if (anilist.ok) {
    const payload = await anilist.json();
    console.log('  OK AniList metadata:', payload?.data?.Media?.title?.romaji);
  } else {
    console.log('  NOTE AniList HTTP', anilist.status, '(app client may still work; not required for smoke)');
  }

  console.log('PHASE2_SMOKE_PASS');
}

main().catch((error) => {
  console.error('PHASE2_SMOKE_FAIL', error);
  process.exit(1);
});
