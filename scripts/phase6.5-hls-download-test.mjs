import assert from 'node:assert/strict';
import { loadProviderTs } from './phase6.5-test-loader.mjs';
const files = [],
  written = [];
let body = '#EXTM3U\n#EXT-X-ENDLIST\n#EXTINF:5,\none.ts\n#EXTINF:5,\ntwo.ts\n';
const original = globalThis.fetch;
globalThis.fetch = async () => new Response(body);
const { downloadHls } = loadProviderTs('services/hlsDownload.ts', {
  '@/services/storageService': {
    downloadFile: async (url, path) => {
      files.push({ url, path });
      return { uri: path, size: 100 };
    },
    saveTextFile: async (path, text) => written.push({ path, text }),
  },
});
try {
  const result = await downloadHls(
    'https://media.invalid/a/list.m3u8',
    'file:///episode/',
    { isAborted: false },
    () => {},
  );
  assert.equal(result.bytes, 200);
  assert.equal(files.length, 2);
  assert.match(written[0].text, /segment-0.ts/);
  assert.doesNotMatch(written[0].text, /https:/);
  assert.equal(result.localPath, 'file:///episode/video.m3u8');
  body = '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key"\n#EXT-X-ENDLIST\nvideo.ts';
  await assert.rejects(
    () => downloadHls('https://media.invalid/list', 'file:///x/', { isAborted: false }, () => {}),
    /not supported/,
  );
  body = '#EXTM3U\n#EXTINF:5,\nvideo.ts';
  await assert.rejects(
    () => downloadHls('https://media.invalid/list', 'file:///x/', { isAborted: false }, () => {}),
    /VOD/,
  );
  assert.equal(written.length, 1, 'unsupported streams never produce a completed local manifest');
  globalThis.fetch = async (url) =>
    new Response(
      String(url).endsWith('master')
        ? '#EXTM3U\n#EXT-X-MEDIA:TYPE=SUBTITLES,LANGUAGE="en",URI="captions"\n#EXT-X-STREAM-INF:BANDWIDTH=1000,RESOLUTION=1280x720\nvideo\n'
        : String(url).endsWith('captions')
          ? '#EXTM3U\n#EXTINF:10,\nenglish.vtt\n#EXT-X-ENDLIST'
          : '#EXTM3U\n#EXTINF:10,\nmedia.ts\n#EXT-X-ENDLIST',
    );
  const subtitled = await downloadHls(
    'https://media.invalid/master',
    'file:///sub/',
    { isAborted: false },
    () => {},
  );
  assert.equal(subtitled.bytes, 200);
  assert.ok(files.some((file) => file.path.endsWith('caption-1.vtt')));
  assert.match(written.at(-1).text, /SUBTITLES="en"/);
  assert.ok(
    written.some(
      (file) => file.path.endsWith('english.m3u8') && file.text.includes('caption-1.vtt'),
    ),
  );
  files.length = 0;
  written.length = 0;
  const response = (body, url, status = 200) => {
    const r = new Response(body, { status });
    Object.defineProperty(r, 'url', { value: url });
    return r;
  };
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(String(url));
    if (String(url) === 'https://media.invalid/start')
      return response(
        '#EXTM3U\n#EXT-X-STREAM-INF:RESOLUTION=1280x720\nbroken.m3u8\n#EXT-X-STREAM-INF:RESOLUTION=640x360\nlow.m3u8',
        'https://media.invalid/redirect/master.m3u8',
      );
    if (String(url).endsWith('broken.m3u8'))
      return response('', 'https://media.invalid/redirect/broken.m3u8', 404);
    return response(
      '#EXTM3U\n#EXTINF:10,\nfirst.ts\n#EXT-X-ENDLIST',
      'https://media.invalid/redirect/low.m3u8',
    );
  };
  await downloadHls(
    'https://media.invalid/start',
    'file:///retry/',
    { isAborted: false },
    () => {},
  );
  assert.ok(requested.includes('https://media.invalid/redirect/low.m3u8'));
  assert.equal(files[0].url, 'https://media.invalid/redirect/first.ts');
  let active = 0,
    peak = 0,
    settled = 0,
    started = 0,
    fail = false;
  const manifests = [];
  globalThis.fetch = async () =>
    new Response(
      '#EXTM3U\n' +
        Array.from({ length: 8 }, (_, i) => '#EXTINF:5,\n' + i + '.ts').join('\n') +
        '\n#EXT-X-ENDLIST',
    );
  const bounded = loadProviderTs('services/hlsDownload.ts', {
    '@/services/storageService': {
      downloadFile: async (url, path) => {
        const index = started++;
        active++;
        peak = Math.max(peak, active);
        try {
          await new Promise((resolve) => setTimeout(resolve, index === 0 ? 2 : 15));
          if (fail && index === 0) throw Error('sample failure');
          return { uri: path, size: 10 };
        } finally {
          active--;
          settled++;
        }
      },
      saveTextFile: async (path, text) => manifests.push({ path, text }),
    },
  });
  await bounded.downloadHls(
    'https://media.invalid/list',
    'file:///bounded/',
    { isAborted: false },
    () => {},
  );
  assert.equal(peak, 3);
  assert.equal(settled, 8);
  assert.equal(active, 0);
  assert.equal(manifests.length, 1);
  active = peak = settled = started = 0;
  fail = true;
  manifests.length = 0;
  await assert.rejects(
    () =>
      bounded.downloadHls(
        'https://media.invalid/list',
        'file:///failed/',
        { isAborted: false },
        () => {},
      ),
    /sample failure/,
  );
  assert.equal(active, 0, 'failure waits for in-flight workers to settle');
  assert.equal(started, 3, 'failure stops queued segments');
  assert.equal(settled, 3);
  assert.equal(manifests.length, 0, 'failure cannot publish a complete manifest');
  console.log('PASS three download workers, failure settlement and incomplete manifest prevention');
  console.log('PASS redirected playlist base and same-episode variant fallback after 404');
  console.log('PASS English captions retained in local master, subtitle playlist and VTT files');
  console.log(
    'PASS real HLS downloader: segment storage, relative local manifest, bytes, encrypted/live rejection',
  );
} finally {
  globalThis.fetch = original;
}
