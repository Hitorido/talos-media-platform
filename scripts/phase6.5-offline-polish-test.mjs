import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { loadProviderTs } from './phase6.5-test-loader.mjs';
const require = createRequire(import.meta.url);
const { groupDownloads } = loadProviderTs('services/downloadGroups.ts');
const base = {
  mediaType: 'manga',
  status: 'completed',
  localPath: 'file:///chapter',
  coverUrl: '',
  mediaTitle: 'Book',
  updatedAt: 1,
};
const entries = [
  { ...base, id: 'a2', mediaId: 'a', unitId: 'two', unitNumber: 2, createdAt: 10 },
  { ...base, id: 'b1', mediaId: 'b', unitId: 'one', unitNumber: 1, createdAt: 20 },
  { ...base, id: 'a1', mediaId: 'a', unitId: 'one', unitNumber: 1, createdAt: 5 },
];
const order = (items) => groupDownloads(items).map((g) => [g.key, g.items.map((i) => i.id)]);
assert.deepEqual(order(entries), [
  ['manga:b', ['b1']],
  ['manga:a', ['a1', 'a2']],
]);
assert.deepEqual(
  order(entries.map((x, i) => ({ ...x, updatedAt: 1000 - i * 100, progress: 0.7 }))),
  order(entries),
);
console.log('PASS title and unit order stays stable across concurrent progress updates');

const disk = new Map();
const deps = {
  'react-native': { Platform: { OS: 'android' } },
  '@/services/storageService': {
    getBaseDownloadsDir: () => 'file:///downloads/',
    downloadFile: async (_url, uri) => ({ uri, size: 20 }),
  },
  '@/services/persistenceService': {
    savePersistedState: async (k, v) => disk.set(k, structuredClone(v)),
    loadPersistedState: async (k) => disk.get(k),
  },
  '@/stores/downloadStore': { useDownloadStore: { getState: () => ({ items: {} }) } },
};
const catalog = loadProviderTs('services/offlineCatalog.ts', deps);
const details = {
  id: 'novel__book',
  title: 'Book',
  description: 'Full description',
  coverUrl: 'https://source.invalid/cover',
  chapters: [{ id: 'one', paragraphs: ['Text'] }],
};
await Promise.all([
  catalog.saveOfflineCatalog('novel', details),
  catalog.flushOfflineCatalog(details.id),
]);
const restored = loadProviderTs('services/offlineCatalog.ts', deps);
const offline = await restored.loadOfflineCatalog('novel', details.id);
assert.equal(offline.description, details.description);
assert.deepEqual(offline.chapters[0].paragraphs, []);
assert.match(offline.coverUrl, /^file:/);
console.log('PASS full details and local cover survive recreation without provider access');

const originalFetch = globalThis.fetch;
const files = new Map();
const cues = loadProviderTs('services/subtitleCues.ts');
const subtitles = loadProviderTs('services/offlineSubtitles.ts', {
  'expo-file-system/legacy': { readAsStringAsync: async (url) => files.get(url) },
  '@/services/storageService': { saveTextFile: async (p, t) => files.set(p, t) },
  '@/services/subtitleCues': cues,
});
try {
  globalThis.fetch = async (url) =>
    url.includes('missing')
      ? new Response('', { status: 404 })
      : new Response('WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nDialogue\n');
  const result = await subtitles.saveOfflineSubtitles(
    [
      { language: 'English', url: 'https://subs/en' },
      { language: 'Japanese', url: 'https://subs/ja' },
      { language: 'French', url: 'https://subs/missing' },
    ],
    'file:///episode/',
    { isAborted: false },
  );
  assert.equal(result.tracks.length, 2);
  assert.match(result.warning, /French/);
  globalThis.fetch = () => {
    throw Error('offline network must not be used');
  };
  assert.equal(
    cues.parseSubtitleCues(await subtitles.readSubtitleText(result.tracks[0].url))[0].text,
    'Dialogue',
  );
  assert.equal(
    (
      await subtitles.saveOfflineSubtitles([{ language: 'en', url: 'x' }], 'file:///x/', {
        isAborted: true,
      })
    ).tracks.length,
    0,
  );
} finally {
  globalThis.fetch = originalFetch;
}
console.log(
  'PASS multilingual captions saved, local-file playback, optional failure and cancellation',
);

let running = false,
  starts = 0,
  stops = 0,
  permissions = 0;
const native = { RNBackgroundActions: {} };
const appState = { currentState: 'active' };
const background = loadProviderTs('services/downloadBackground.ts', {
  'react-native': {
    Platform: { OS: 'android', Version: 36 },
    AppState: appState,
    NativeModules: native,
    PermissionsAndroid: {
      PERMISSIONS: { POST_NOTIFICATIONS: 'notifications' },
      request: async () => {
        permissions++;
      },
    },
  },
  '@/stores/dialogStore': { appAlert: { alert() {} } },
  'react-native-background-actions': {
    __esModule: true,
    default: {
      isRunning: () => running,
      start: async (_task, options) => {
        assert.deepEqual(options.foregroundServiceType, ['dataSync']);
        starts++;
        running = true;
      },
      stop: async () => {
        stops++;
        running = false;
      },
    },
  },
});
await Promise.all([
  background.setDownloadBackgroundActive(true),
  background.setDownloadBackgroundActive(true),
]);
assert.equal(starts, 1);
assert.equal(permissions, 1);
appState.currentState = 'background';
await background.setDownloadBackgroundActive(true);
assert.equal(starts, 1);
await background.setDownloadBackgroundActive(false);
assert.equal(stops, 1);
await background.setDownloadBackgroundActive(true);
assert.equal(starts, 1, 'no illegal background start');
appState.currentState = 'active';
await Promise.all([
  background.setDownloadBackgroundActive(true),
  background.setDownloadBackgroundActive(false),
  background.setDownloadBackgroundActive(true),
]);
assert.equal(running, true);
assert.equal(starts, 3);
await background.setDownloadBackgroundActive(false);
delete native.RNBackgroundActions;
await background.setDownloadBackgroundActive(true);
assert.equal(starts, 3, 'Expo Go does not import missing native module');
console.log('PASS serialized Android service lifecycle, no duplicate start, Expo Go guard');

// Render the actual shared title card and invoke its actions.
let expanded = false;
const pushed = [];
const removed = [];
const jsx = (type, props) => ({ type, props });
const module = { exports: {} };
const routes = loadProviderTs('lib/routes.ts');
const mocks = {
  '@/components/ui/SwipeableRow': { SwipeableRow: 'Swipe' },
  '@/components/ui/Badge': { Badge: 'Badge' },
  '@/services/downloadService': {
    deleteDownload: async (id) => removed.push(id),
    pauseDownload() {},
    resumeDownload() {},
    retryDownload() {},
  },
  '@/stores/downloadStore': {
    useDownloadStore: {
      getState: () => ({ items: Object.fromEntries(entries.map((item) => [item.id, item])) }),
    },
  },
  react: {
    useState: () => [
      expanded,
      (v) => {
        expanded = v;
      },
    ],
  },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': { Image: 'Image', View: 'View' },
  '@expo/vector-icons': { Ionicons: 'Icon' },
  'expo-router': { useRouter: () => ({ push: (r) => pushed.push(r) }) },
  '@/components/ui/PopPressable': { PopPressable: 'Button' },
  '@/components/ui/Text': { Text: 'Text' },
  '@/lib/routes': routes,
  '@/stores/animeProgressStore': { useAnimeProgressStore: (fn) => fn({ progressByAnime: {} }) },
  '@/stores/mangaProgressStore': {
    useMangaProgressStore: (fn) =>
      fn({ progressByManga: { a: { chapterId: 'two', pageNumber: 7 } } }),
  },
  '@/stores/novelProgressStore': { useNovelProgressStore: (fn) => fn({ progressByNovel: {} }) },
};
new Function(
  'require',
  'module',
  'exports',
  ts.transpileModule(fs.readFileSync('components/downloads/DownloadTitleCard.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText,
)(
  (name) =>
    mocks[name] ??
    (() => {
      throw Error(name);
    })(),
  module,
  module.exports,
);
const group = groupDownloads(entries).find((x) => x.key === 'manga:a');
const nodes = (node) =>
  node && typeof node === 'object'
    ? [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]
    : [];
let tree = module.exports.DownloadTitleCard({ group });
let all = nodes(tree);
all.find((n) => n.props?.accessibilityLabel === 'Continue Book').props.onPress();
assert.equal(pushed.pop(), '/manga/a/read/two?page=7');
all
  .filter((n) => n.props?.accessibilityLabel === 'Details for Book')[0]
  .props.onPress({ stopPropagation() {} });
assert.equal(pushed.pop(), '/manga/a');
all.find((n) => n.props?.accessibilityState).props.onPress({ stopPropagation() {} });
tree = module.exports.DownloadTitleCard({ group });
all = nodes(tree);
assert.equal(all.filter((n) => n.type === 'Button').length, 5);
const swipes = all.filter((n) => n.type === 'Swipe');
assert.equal(swipes.length, 3);
swipes[1].props.onSwipeRight();
assert.deepEqual(removed.splice(0), ['a1']);
// A filtered title card still removes every downloaded unit belonging to that title.
const filtered = nodes(
  module.exports.DownloadTitleCard({ group: { ...group, items: [group.items[0]] } }),
);
filtered.find((n) => n.type === 'Swipe').props.onSwipeRight();
assert.deepEqual(removed.splice(0).sort(), ['a1', 'a2']);
console.log(
  'PASS shared Downloads/Library card resumes exact saved page, title opens details, dropdown lists units',
);

const adapter = loadProviderTs('backend/src/providers/novelcodex/adapter.ts', {
  cheerio: require('../backend/node_modules/cheerio'),
  '../types.js': loadProviderTs('backend/src/providers/types.ts'),
  '../shared/sourceHttp.js': {
    checkedId: (v) => v,
    sourceText: async (_origin, path) =>
      path.includes('/access')
        ? JSON.stringify({ lockThreshold: 20, total: 40 })
        : '<body><article><p>Daily reading limit reached</p></article></body>',
  },
}).novelCodexAdapter;
await assert.rejects(
  adapter.getNovelContent('book', '10'),
  (e) => e.code === 'SOURCE_DAILY_LIMIT' && e.statusCode === 429,
);
await assert.rejects(adapter.getNovelContent('book', '21'), (e) => e.code === 'CONTENT_LOCKED');
console.log('PASS source daily limits and locked chapters remain explicit; no access workaround');

// Pausing does not release a concurrency slot before its actual file write settles.
const held = [];
let activeFiles = 0,
  peakFiles = 0;
const items = Object.fromEntries(
  ['one', 'two', 'three'].map((id, index) => [
    id,
    {
      id,
      mediaId: 'm',
      unitId: id,
      mediaType: 'manga',
      status: 'queued',
      payload: { pageUrls: ['https://pages/' + id] },
      createdAt: index,
    },
  ]),
);
const queueStore = {
  items,
  setStatus(id, status, extra) {
    if (items[id]) Object.assign(items[id], { status }, extra);
  },
  updateProgress() {},
  pauseDownload(id) {
    items[id].status = 'paused';
  },
  resumeDownload(id) {
    items[id].status = 'queued';
  },
};
const queue = loadProviderTs('services/downloadService.ts', {
  '@/services/downloadBackground': { setDownloadBackgroundActive: async () => {} },
  '@/services/offlineSubtitles': { saveOfflineSubtitles: async () => ({ tracks: [], bytes: 0 }) },
  '@/services/hlsDownload': {},
  '@/services/offlineCatalog': {
    flushOfflineCatalog: async () => {},
    saveOfflineCatalog: async () => {},
  },
  '@/services/storageService': {
    getMangaChapterStorageDir: (_id, unit) => 'file:///' + unit + '/',
    saveJsonFile: async () => {},
    downloadFile: async (_url, uri) => {
      activeFiles++;
      peakFiles = Math.max(peakFiles, activeFiles);
      await new Promise((resolve) => held.push(resolve));
      activeFiles--;
      return { uri, size: 10 };
    },
  },
  '@/stores/downloadStore': { useDownloadStore: { getState: () => queueStore } },
});
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
await queue.processDownloadQueue();
await tick();
assert.equal(activeFiles, 2);
queue.pauseDownload('one');
queue.resumeDownload('one');
await tick();
assert.equal(activeFiles, 2);
assert.equal(held.length, 2);
held.shift()();
held.shift()();
await tick();
await tick();
while (held.length) {
  held.shift()();
  await tick();
  await tick();
}
assert.equal(peakFiles, 2);
assert.ok(Object.values(items).every((item) => item.status === 'completed'));
console.log('PASS pause/resume keeps two actual transfers maximum and drains queued work');
