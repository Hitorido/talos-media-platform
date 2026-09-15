/**
 * Phase 5.3 anime source evidence smoke.
 * This distinguishes metadata access from playable-source verification.
 */

async function request(label, url, options) {
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    console.log(`${label}: HTTP ${response.status} (${text.length} bytes)`);
    return { response, text };
  } catch (error) {
    console.log(`${label}: REQUEST_FAILED (${error instanceof Error ? error.message : 'unknown error'})`);
    return null;
  }
}

async function main() {
  console.log('=== Phase 5.3 Anime Source Evidence ===');

  const consumet = await request('Public Consumet', 'https://api.consumet.org/anime/gogoanime/naruto');
  if (consumet?.response.status === 451) {
    console.log('Public Consumet status: REQUIRES CONFIGURATION / UNAVAILABLE');
  }

  const jikan = await request('Jikan metadata', 'https://api.jikan.moe/v4/anime/1');
  if (jikan?.response.ok) console.log('Jikan capability: metadata only; no playback contract');

  const kitsu = await request(
    'Kitsu metadata',
    'https://kitsu.io/api/edge/anime?filter[text]=naruto&page[limit]=1',
  );
  if (kitsu?.response.ok) console.log('Kitsu capability: metadata only; no playback contract');

  const anilist = await request('AniList metadata', 'https://graphql.anilist.co', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'query ($id: Int) { Media(id: $id, type: ANIME) { id title { romaji } } }',
      variables: { id: 21 },
    }),
  });
  if (anilist?.response.ok) console.log('AniList capability: metadata only; no playback contract');

  console.log('Playback verification: NOT VERIFIED without a configured, reachable Consumet-compatible endpoint.');
  console.log('PHASE5.3_EVIDENCE_COMPLETE');
}

main().catch((error) => {
  console.error('PHASE5.3_EVIDENCE_FAILED', error);
  process.exit(1);
});
