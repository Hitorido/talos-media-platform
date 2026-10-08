import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url),
  express = require('../backend/node_modules/express');
const {
  imageProxy,
  videoProxy,
  imageTarget,
  checkedRange,
} = require('../backend/dist/media/proxy.js');
const { contentGateway } = require('../backend/dist/providers/contentGateway.js');
for (const path of [
  'https://127.0.0.1/a.png',
  '/ch/1/../a.png',
  '/ch/1//a.png',
  '/ch/1/a.svg',
  '/ch/1/a.png?url=x',
])
  assert.throws(() => imageTarget('manhuaplus', path));
assert.throws(() => imageTarget('unknown', '/ch/1/a.png'));
assert.throws(() => checkedRange('bytes=0-2,4-6'));
const app = express();
const handler = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
app.get('/image/:providerId', handler(imageProxy));
app.get('/video/:providerId/:mediaId/:episodeId', handler(videoProxy));
app.use((err, req, res, next) => res.status(err.statusCode ?? 500).json({ error: err.message }));
const server = await new Promise((resolve) => {
  const server = app.listen(0, '127.0.0.1', () => resolve(server));
});
const base = 'http://127.0.0.1:' + server.address().port,
  originalFetch = global.fetch,
  originalPlayback = contentGateway.getPlaybackSource;
let mode = 'image',
  calls = 0,
  last,
  aborted = false;
global.fetch = async (url, options) => {
  if (String(url).startsWith(base)) return originalFetch(url, options);
  calls++;
  last = { url, options };
  assert.equal(options.redirect, 'error');
  assert.equal(options.headers.Authorization, undefined);
  if (mode === 'oversize')
    return new Response('x', {
      headers: { 'content-type': 'image/png', 'content-length': '10000001' },
    });
  if (mode === 'html')
    return new Response('<html>challenge</html>', { headers: { 'content-type': 'text/html' } });
  if (mode === 'disconnect')
    return new Promise((_, reject) =>
      options.signal.addEventListener('abort', () => {
        aborted = true;
        reject(new Error('aborted'));
      }),
    );
  if (mode === 'video')
    return new Response(options.method === 'HEAD' ? null : new Uint8Array([1, 2, 3, 4]), {
      status: 206,
      headers: {
        'content-type': 'video/mp4',
        'content-range': 'bytes 0-3/100',
        'content-length': '4',
        'accept-ranges': 'bytes',
      },
    });
  return new Response(new Uint8Array([137, 80, 78, 71]), {
    headers: { 'content-type': 'image/png', 'content-length': '4' },
  });
};
try {
  let r = await fetch(base + '/image/manhuaplus?path=' + encodeURIComponent('/ch/1/a.png'));
  assert.equal(r.status, 200);
  assert.equal((await r.arrayBuffer()).byteLength, 4);
  assert.equal(last.options.headers.Referer, 'https://manhuaplus.org/');
  const before = calls;
  r = await fetch(base + '/image/manhuaplus?url=http://localhost');
  assert.equal(r.status, 400);
  assert.equal(calls, before);
  for (const value of ['oversize', 'html']) {
    mode = value;
    r = await fetch(base + '/image/manhuaplus?path=/ch/1/a.png');
    assert.equal(r.status, 502);
  }
  contentGateway.getPlaybackSource = async (type, provider, title, episode) => {
    assert.equal(provider, 'animexin');
    assert.equal(title, 'series');
    assert.equal(episode, 'episode-1');
    return { url: 'https://download1.mediafire.com/file/episode.mp4' };
  };
  mode = 'video';
  r = await fetch(base + '/video/animexin/series/episode-1', { headers: { Range: 'bytes=0-3' } });
  assert.equal(r.status, 206);
  assert.equal(r.headers.get('content-range'), 'bytes 0-3/100');
  assert.equal((await r.arrayBuffer()).byteLength, 4);
  assert.equal(last.options.headers.Range, 'bytes=0-3');
  r = await fetch(base + '/video/animexin/series/episode-1', {
    method: 'HEAD',
    headers: { Range: 'bytes=0-3' },
  });
  assert.equal(r.status, 206);
  assert.equal((await r.arrayBuffer()).byteLength, 0);
  mode = 'disconnect';
  const controller = new AbortController();
  const request = fetch(base + '/image/manhuaplus?path=/ch/1/a.png', {
    signal: controller.signal,
  }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 50));
  controller.abort();
  await request;
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(aborted, true);
  console.log(
    'PASS Express proxy: fixed hosts/paths, no arbitrary URLs, image MIME/size bounds, Referer, MP4 range/HEAD, disconnect abort',
  );
} finally {
  global.fetch = originalFetch;
  contentGateway.getPlaybackSource = originalPlayback;
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
