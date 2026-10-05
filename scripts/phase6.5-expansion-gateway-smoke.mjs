import assert from 'node:assert/strict';
import { loadProviderTs } from './phase6.5-test-loader.mjs';
const base = process.env.API_BASE ?? 'http://127.0.0.1:5000';
const apiRequestWithWake = async (path) => {
  const r = await fetch(base + path, { signal: AbortSignal.timeout(45000) });
  const b = await r.json();
  if (!r.ok) throw Error('Gateway ' + r.status + ': ' + JSON.stringify(b));
  return b.data;
};
const dependencies = {
  '@/lib/apiConfig': { getApiBaseUrl: () => base },
  '@/services/api/client': { apiRequestWithWake },
  '@/types/provider': loadProviderTs('types/provider.ts'),
};
const comic = loadProviderTs(
  'providers/backend-content/index.ts',
  dependencies,
).backendComicProvider('manhuaplus', 'ManhuaPlus');
const novel = loadProviderTs(
  'providers/backend-content/index.ts',
  dependencies,
).backendNovelProvider('wanderinginn', 'The Wandering Inn');
const anime = loadProviderTs(
  'providers/backend-content/anime.ts',
  dependencies,
).backendAnimeProvider('animexin', 'AnimeXin');
for (const [provider, query, filter] of [
  [comic, 'apotheosis', 'manga'],
  [novel, 'wandering', 'novel'],
  [anime, 'Soul Land 2', 'anime'],
]) {
  const results = await provider.search(query, { filter, limit: 12 });
  assert.ok(results.length);
  const item =
    filter === 'anime'
      ? results.find((r) => r.sourceId === 'soul-land-2-the-peerless-tang-clan')
      : results[0];
  assert.ok(item);
  const ref = { providerId: item.providerId, sourceId: item.sourceId };
  const details = await provider.getDetails(ref);
  assert.ok(details.title);
  if (filter === 'anime') {
    const episodes = await provider.getEpisodes(ref);
    const first = episodes.find((e) => e.number === 1);
    assert.ok(first);
    const playback = await provider.getPlaybackSource(ref, first.id);
    assert.equal(playback.contentType, 'progressive');
    const r = await fetch(playback.url, {
      headers: { Range: 'bytes=0-1023' },
      signal: AbortSignal.timeout(20000),
    });
    assert.equal(r.status, 206);
    assert.equal(
      Buffer.from(await r.arrayBuffer())
        .subarray(4, 8)
        .toString(),
      'ftyp',
    );
    console.log('PASS AnimeXin actual frontend/gateway Episode 1 downloadable MP4 range');
  } else {
    const chapters = await provider.getChapters(ref);
    assert.ok(chapters.length);
    const content =
      filter === 'manga'
        ? await provider.getChapterPages(ref, chapters[0].id)
        : await provider.getNovelContent(ref, chapters[0].id);
    assert.ok(filter === 'manga' ? content.length : content.paragraphs.length);
    console.log(
      'PASS actual frontend/gateway',
      details.title,
      chapters.length,
      'chapters and content',
    );
  }
}
