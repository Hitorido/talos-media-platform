import assert from 'node:assert/strict';
import { load } from 'cheerio/slim';
import { loadProviderTs } from './phase6.5-test-loader.mjs';
const types = loadProviderTs('backend/src/providers/types.ts');
const core = (id) =>
  loadProviderTs(`backend/src/providers/${id}/core.ts`, {
    'cheerio/slim': { load },
    '../types.ts': types,
  });
const platform = { OS: 'android' };
const native = loadProviderTs('providers/backend-content/directAnime.ts', {
  'react-native': { Platform: platform },
  '../../backend/src/providers/animexin/core': core('animexin'),
  '../../backend/src/providers/donghuastream/core': core('donghuastream'),
});
let attempts = 0;
const direct = async () => {
  attempts++;
  return 'direct';
};
assert.equal(
  await native.withDirectAnimeFallback(async () => {
    throw { status: 502, code: 'SOURCE_BLOCKED' };
  }, direct),
  'direct',
);
for (const code of [
  'CONTENT_LOCKED',
  'PROVIDER_DISABLED',
  'SOURCE_RATE_LIMITED',
  'SOURCE_DAILY_LIMIT',
])
  await assert.rejects(
    native.withDirectAnimeFallback(async () => {
      throw { code };
    }, direct),
  );
const controller = new AbortController();
controller.abort();
await assert.rejects(
  native.withDirectAnimeFallback(
    async () => {
      throw Error('cancelled');
    },
    direct,
    controller.signal,
  ),
);
assert.equal(attempts, 1);
platform.OS = 'web';
assert.equal(native.directAnimeAdapter('animexin'), undefined);
platform.OS = 'android';
const original = globalThis.fetch;
globalThis.fetch = async (url) =>
  new Response(
    url.includes('mediafire.com')
      ? '<a id="downloadButton" href="https://download1.mediafire.com/a/episode.mp4">Download</a>'
      : url.includes('/episode-1/')
        ? '<a href="https://www.mediafire.com/file/abc/episode_eng.mp4/file">English</a>'
        : '<h1>Example</h1><div class="eplister"><a href="https://animexin.dev/episode-1/"><span class="epl-num">1</span></a></div><div class="bsx"><a href="https://animexin.dev/example/"><h2>Example</h2></a></div>',
  );
const bridge = loadProviderTs('providers/backend-content/anime.ts', {
  './directAnime': native,
  '@/services/api/client': {
    apiRequestWithWake: async () => {
      throw { status: 502, code: 'SOURCE_BLOCKED' };
    },
  },
  '@/types/provider': loadProviderTs('types/provider.ts'),
}).backendAnimeProvider('animexin', 'AnimeXin');
const ref = { providerId: 'animexin', sourceId: 'example' };
assert.equal((await bridge.search('Example', { filter: 'anime' }))[0].sourceId, 'example');
assert.equal((await bridge.getDetails(ref)).title, 'Example');
assert.equal((await bridge.getEpisodes(ref))[0].number, 1);
assert.equal(
  (await bridge.getPlaybackSource(ref, 'episode-1')).url,
  'https://download1.mediafire.com/a/episode.mp4',
);
await assert.rejects(bridge.getPlaybackSource(ref, 'unlisted'));
await assert.rejects(bridge.getDetails({ ...ref, sourceId: '../outside' }));
globalThis.fetch = original;
console.log(
  'PASS native search/details/episodes/playback fallback; cancellation, web exclusion and access checks',
);
