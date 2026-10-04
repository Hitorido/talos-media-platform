import assert from 'node:assert/strict';
import { loadProviderTs } from './phase6.5-test-loader.mjs';
const base = process.env.API_BASE || 'http://127.0.0.1:5000';
const apiRequest = async (path) => {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  if (!response.ok) throw new Error('Gateway ' + response.status + ': ' + JSON.stringify(data));
  return data.data;
};
const models = loadProviderTs('types/provider.ts');
const anime = loadProviderTs('providers/backend-content/anime.ts', {
  '@/services/api/client': { apiRequest },
  '@/types/provider': models,
}).backendAnimeProvider('donghuastream', 'DonghuaStream');
const results = await anime.search('Soul Land 2', { filter: 'anime' });
const title = results.find((item) => item.sourceId === 'soul-land-2nd');
assert.ok(title);
assert.ok(title.alternativeTitles.includes('Soul Land 2: The Peerless Tang Clan'));
const ref = { providerId: 'donghuastream', sourceId: title.sourceId };
const episodes = await anime.getEpisodes(ref);
assert.ok(episodes.length >= 172);
const episode = episodes.find((item) => item.number === 172);
const playback = await anime.getPlaybackSource(ref, episode.id);
assert.equal(playback.contentType, 'hls');
const playlist = await fetch(playback.url, { signal: AbortSignal.timeout(20000) }).then(
  (response) => response.text(),
);
assert.match(playlist, /#EXTM3U/);
assert.match(playlist, /#EXT-X-ENDLIST/);
assert.ok(
  [...playlist.matchAll(/#EXTINF:([\d.]+)/g)].reduce((sum, match) => sum + Number(match[1]), 0) >
    800,
);
await assert.rejects(() => anime.getPlaybackSource(ref, 'unlisted-episode'), /404/);
console.log(
  'PASS DonghuaStream actual frontend/gateway: source aliases, 172 episodes, episode 172 full VOD, membership rejection',
);
const novel = loadProviderTs('providers/backend-content/index.ts', {
  '@/lib/apiConfig': { getApiBaseUrl: () => base },
  '@/services/api/client': { apiRequest },
  '@/types/provider': models,
}).backendNovelProvider('royalroad', 'Royal Road');
const books = await novel.search('mother of learning', { filter: 'novel' });
assert.ok(
  books.some((item) => item.sourceId === '21220/mother-of-learning' && item.language === 'en'),
);
const book = { providerId: 'royalroad', sourceId: '21220/mother-of-learning' };
const detail = await novel.getDetails(book),
  chapters = await novel.getChapters(book);
assert.equal(chapters.length, 109);
const content = await novel.getNovelContent(book, chapters[0].id);
assert.ok(content.paragraphs.length > 100);
await assert.rejects(() => novel.getNovelContent(book, '1/unlisted-chapter'), /404/);
console.log(
  'PASS Royal Road actual frontend/gateway:',
  detail.title,
  chapters.length,
  'chapters,',
  content.paragraphs.length,
  'paragraphs, membership rejection',
);
