import assert from 'node:assert/strict';
import { loadProviderTs } from './phase6.5-test-loader.mjs';
const calls = [],
  saved = [];
const items = Object.fromEntries(
  ['anime', 'manga', 'novel'].map((mediaType) => [
    mediaType,
    {
      id: mediaType,
      mediaId: mediaType + '__book',
      unitId: 'one',
      mediaType,
      payload: {},
      status: 'queued',
    },
  ]),
);
const store = {
  items,
  setStatus(id, status, extra) {
    Object.assign(items[id], { status }, extra);
  },
  updateProgress() {},
};
const service = loadProviderTs('services/downloadService.ts', {
  '@/services/downloadBackground': { setDownloadBackgroundActive: async () => {} },
  '@/services/offlineSubtitles': { saveOfflineSubtitles: async () => ({ tracks: [], bytes: 0 }) },
  '@/services/offlineCatalog': {
    flushOfflineCatalog: async () => {},
    saveOfflineCatalog: async () => {},
  },
  '@/services/hlsDownload': {
    downloadHls: async () => {
      calls.push('hls');
      return { localPath: 'file:///anime/video.m3u8', bytes: 200 };
    },
  },
  '@/services/storageService': {
    deleteStoragePath: async () => {},
    downloadFile: async (url, path) => {
      calls.push(url);
      return { uri: path, size: 100 };
    },
    getAnimeStoragePath: () => 'file:///anime/video.mp4',
    getMangaChapterStorageDir: () => 'file:///manga/',
    getNovelChapterStoragePath: () => 'file:///novel/chapter.json',
    saveJsonFile: async (path, data) => saved.push({ path, data }),
  },
  '@/stores/downloadStore': { useDownloadStore: { getState: () => store } },
  '@/services/contentService': {
    resolveAnimePlayback: async () => {
      calls.push('resolve anime');
      return { source: { url: 'https://test.invalid/playlist', contentType: 'hls' } };
    },
    getMangaChapterPages: async () => {
      calls.push('resolve manga');
      return [{ imageUrl: 'https://test.invalid/page.jpg', pageNumber: 1 }];
    },
    resolveNovelChapterContent: async () => {
      calls.push('resolve novel');
      return { chapter: { paragraphs: ['Public text'] } };
    },
  },
});
await service.processDownloadQueue();
for (let i = 0; i < 100 && Object.values(items).some((item) => item.status !== 'completed'); i++)
  await new Promise((resolve) => setTimeout(resolve, 5));
assert.ok(
  Object.values(items).every((item) => item.status === 'completed'),
  JSON.stringify(items),
);
for (const call of ['resolve anime', 'resolve manga', 'resolve novel', 'hls'])
  assert.ok(calls.includes(call), call);
assert.ok(saved.some((file) => file.data.pages?.[0].localUri === 'file:///manga/page-001.jpg'));
assert.ok(saved.some((file) => file.data.paragraphs?.[0] === 'Public text'));
console.log(
  'PASS real download queue lazily resolves provider anime/manga/novel content and completes only after local storage',
);
