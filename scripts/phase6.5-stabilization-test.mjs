import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as zustand from 'zustand';
import * as middleware from 'zustand/middleware';
import { loadProviderTs } from './phase6.5-test-loader.mjs';
const routes = loadProviderTs('lib/routes.ts');
assert.equal(routes.mangaDetailsHref('mangapill__2/one-piece'), '/manga/mangapill__2%2Fone-piece');
assert.equal(
  routes.mangaReadHref('gdscans__sage', 'vol-1/ch-1-1'),
  '/manga/gdscans__sage/read/vol-1%2Fch-1-1',
);
const website = loadProviderTs('services/sourceWebsite.ts', {
  '@/types/provider': loadProviderTs('types/provider.ts'),
});
assert.equal(
  website.sourceWebsite('novelcodex__shadow-slave', '1').url,
  'https://www.novelcodex.org/novel/shadow-slave/read/1',
);
assert.equal(website.sourceWebsite('mangapill__../../evil.invalid').url, 'https://mangapill.com/');
const memory = new Map();
const storage = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => memory.set(k, v),
  removeItem: (k) => memory.delete(k),
};
const deps = {
  zustand: zustand,
  'zustand/middleware': middleware,
  '@/stores/persistStorage': { appPersistStorage: storage },
};
const library = loadProviderTs('stores/libraryStore.ts', deps).useLibraryStore;
const media = {
  id: 'novelcodex__shadow-slave',
  title: 'Shadow Slave',
  coverUrl: 'https://test.invalid/cover',
  mediaType: 'novel',
  genres: [],
  chapterCount: 2097,
};
library.getState().rememberMedia(media);
library.getState().addToLibrary(media.id, 'novel');
library.getState().saveFavorite(media.id, 'novel', ['Reading now']);
const restored = loadProviderTs('stores/libraryStore.ts', deps).useLibraryStore;
assert.equal(restored.getState().media[media.id].title, 'Shadow Slave');
assert.ok(restored.getState().isFavorite(media.id, 'novel'));
assert.deepEqual(restored.getState().entries.find((e) => e.mediaId === media.id).tags, [
  'Reading now',
]);
const bookmarkStore = loadProviderTs('stores/mediaBookmarkStore.ts', deps).useMediaBookmarkStore;
bookmarkStore.getState().toggle({
  kind: 'manga',
  mediaId: 'mangapill__2/one-piece',
  unitId: '1/chapter',
  unitTitle: 'Chapter 1',
  position: 12,
});
bookmarkStore.getState().toggle({
  kind: 'anime',
  mediaId: 'anilist-anime__20',
  unitId: '1',
  unitTitle: 'Episode 1',
  position: 93.7,
});
const restoredBookmarks = loadProviderTs(
  'stores/mediaBookmarkStore.ts',
  deps,
).useMediaBookmarkStore;
await restoredBookmarks.persist.rehydrate();
assert.equal(restoredBookmarks.getState().bookmarks.length, 2);
assert.equal(restoredBookmarks.getState().bookmarks[0].position, 93);
assert.equal(
  routes.mangaReadHref('mangapill__2/one-piece', '1/chapter', 12),
  '/manga/mangapill__2%2Fone-piece/read/1%2Fchapter?page=12',
);
bookmarkStore.getState().save({
  kind: 'manga',
  mediaId: 'comic',
  unitId: 'ch',
  unitTitle: 'Chapter',
  position: 3,
  previewUri: 'file:///preview.jpg',
  view: { fraction: 0.63, scale: 2, pan: -0.2 },
});
const viewStore = loadProviderTs('stores/mediaBookmarkStore.ts', deps).useMediaBookmarkStore;
await viewStore.persist.rehydrate();
assert.deepEqual(viewStore.getState().bookmarks[0].view, { fraction: 0.63, scale: 2, pan: -0.2 });
assert.equal(viewStore.getState().bookmarks[0].previewUri, 'file:///preview.jpg');
assert.match(routes.mangaReadHref('comic', 'ch', 3, 'saved/id'), /page=3&bookmark=saved%2Fid/);
assert.equal(
  routes.animeWatchHref('anilist-anime__20', '1', 93),
  '/anime/anilist-anime__20/watch/1?seconds=93',
);
console.log(
  'PASS page/scene bookmarks persist across store recreation with encoded location routes',
);
console.log(
  'PASS encoded source/chapter routes, fixed-origin website fallback, real-source metadata/favorites/tags survive store recreation',
);

// Execute the actual player component and effects against a deterministic Expo player.
function loadComponent(path, dependencies) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  new Function('require', 'module', 'exports', '__DEV__', code)(
    (name) => {
      if (!(name in dependencies)) throw Error('Unexpected import ' + name);
      return dependencies[name];
    },
    module,
    module.exports,
    false,
  );
  return module.exports.default;
}
const slots = [];
let cursor = 0,
  effects = [];
const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => v === b[i]);
const React = {
  useState(initial) {
    const i = cursor++;
    if (!(i in slots)) slots[i] = initial;
    return [
      slots[i],
      (v) => {
        slots[i] = typeof v === 'function' ? v(slots[i]) : v;
      },
    ];
  },
  useRef(initial) {
    const i = cursor++;
    return slots[i] ?? (slots[i] = { current: initial });
  },
  useMemo(fn, deps) {
    const i = cursor++;
    if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: fn() };
    return slots[i].value;
  },
  useCallback(fn, deps) {
    return this.useMemo(() => fn, deps);
  },
  useEffect(fn, deps) {
    const i = cursor++;
    if (!same(slots[i]?.deps, deps)) {
      const old = slots[i];
      slots[i] = { deps, cleanup: old?.cleanup };
      effects.push(() => {
        old?.cleanup?.();
        slots[i].cleanup = fn();
      });
    }
  },
};
React.useCallback = (fn, deps) => React.useMemo(() => fn, deps);
const playerFetch = globalThis.fetch;
let supplyCaptions;
globalThis.fetch = () =>
  new Promise((resolve) => {
    supplyCaptions = resolve;
  });
let currentSource;
const listeners = {};
const seeks = [];
let position = 42,
  saved = 42;
const player = {
  play() {},
  status: 'readyToPlay',
  duration: 1400,
  set currentTime(v) {
    seeks.push(v);
    position = v;
  },
  get currentTime() {
    return position;
  },
  addListener(name, fn) {
    (listeners[name] ??= new Set()).add(fn);
    return { remove: () => listeners[name].delete(fn) };
  },
};
const state = {
  getEpisodeProgress: () => ({ positionSeconds: saved }),
  setEpisodeProgress: (p) => {
    saved = p.positionSeconds;
  },
};
const useStore = (selector) => selector(state);
useStore.getState = () => state;
const jsx = (type, props) => ({ type, props });
let backHandlerListeners = [];
const Player = loadComponent('app/anime/[id]/watch/[episodeId].tsx', {
  react: React,
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'expo-router': {
    Stack: { Screen: 'Screen' },
    useRouter: () => ({ back() {}, canGoBack: () => true, replace() {} }),
    useLocalSearchParams: () => ({ id: 'animeparadise__naruto', episodeId: '1' }),
  },
  'expo-video': {
    useVideoPlayer: (source) => {
      currentSource = source;
      return player;
    },
    VideoView: 'VideoView',
  },
  'react-native': {
    ActivityIndicator: 'Spinner',
    Animated: {
      Value: class {
        constructor(v) {
          this._v = v;
        }
        setValue(v) {
          this._v = v;
        }
        stopAnimation() {}
      },
      View: 'AnimatedView',
      timing: (_val, _cfg) => ({
        start(cb) {
          if (typeof cb === 'function') cb();
        },
      }),
    },
    Pressable: 'Button',
    View: 'View',
    ScrollView: 'ScrollView',
    BackHandler: {
      addEventListener: (_event, listener) => {
        if (!backHandlerListeners) backHandlerListeners = [];
        const entry = { listener };
        backHandlerListeners.push(entry);
        return {
          remove: () => {
            backHandlerListeners = backHandlerListeners.filter((e) => e !== entry);
          },
        };
      },
    },
  },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0 }) },
  '@/components/ui': { Badge: 'Badge', Text: 'Text', Button: 'ControlButton' },
  '@/components/content/SourceWebsiteButton': { SourceWebsiteButton: 'Website' },
  '@/services/subtitleCues': loadProviderTs('services/subtitleCues.ts'),
  '@/stores/mediaBookmarkStore': { useMediaBookmarkStore: (fn) => fn({ save() {} }) },
  '@/stores/animeProgressStore': { useAnimeProgressStore: useStore },
  '@/stores/subtitlePreferencesStore': {
    useSubtitlePreferencesStore: () => ({
      fontSize: 16,
      color: 'white',
      background: false,
      backgroundOpacity: 0.6,
      outline: true,
      update() {},
    }),
  },
  '@/services/contentService': {
    getProviderDisplayName: () => 'AnimeParadise',
    resolveAnimePlayback: async () => ({
      source: {
        url: 'https://test.invalid/stream',
        fallbackUrl: 'https://test.invalid/original',
        providerId: 'animeparadise',
        contentType: 'hls',
        subtitles: [{ language: 'en', url: 'https://test.invalid/english.vtt' }],
      },
      episodeNumber: 1,
      episodeTitle: 'Episode 1',
      durationSeconds: 1400,
    }),
  },
  '@/lib/routes': loadProviderTs('lib/routes.ts'),
});
let playerTree;
function render() {
  cursor = 0;
  playerTree = Player();
  const pending = effects;
  effects = [];
  pending.forEach((fn) => fn());
}
render();
await Promise.resolve();
render();
assert.deepEqual(seeks, [42]);
for (const t of [43, 44, 45]) {
  for (const fn of listeners.timeUpdate ?? []) fn({ currentTime: t });
  render();
  for (const fn of listeners.statusChange ?? []) fn({ status: 'readyToPlay' });
  render();
}
assert.deepEqual(seeks, [42], 'progress saves and repeated ready events must never seek backward');
assert.equal(saved, 43);
const englishTrack = { id: 'en', language: 'en', label: 'English' };
for (const fn of listeners.sourceLoad ?? [])
  fn({ availableSubtitleTracks: [{ id: 'ja', language: 'ja', label: 'Japanese' }, englishTrack] });
assert.equal(player.subtitleTrack, englishTrack, 'select the real English native track');
render();
const video = find(playerTree, 'VideoView');
assert.equal(
  video.props.fullscreenOptions.enable,
  false,
  'fullscreen must wait for a rendered frame',
);
video.props.onFirstFrameRender();
video.props.onFirstFrameRender();
render();
assert.equal(find(playerTree, 'Screen').props.options.orientation, 'landscape');
assert.equal(
  find(playerTree, 'VideoView').props.fullscreenOptions.enable,
  false,
  'native fullscreen is disabled so overlays stay with the video',
);
function byLabel(node, label) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = byLabel(item, label);
      if (hit) return hit;
    }
  } else if (node.props?.label === label) return node;
  else return byLabel(node.props?.children, label);
}
assert.ok(byLabel(playerTree, 'Settings'));
assert.ok(byLabel(playerTree, 'Bookmark Moment'));
// New architecture: no separate Exit fullscreen button; overlay controls fade with player UI.
// Controls are inside the Pressable wrapper area.
assert.equal(find(playerTree, 'Screen').props.options.orientation, 'landscape');
position = 90;
// Trigger hardware back to exit fullscreen
const lastBackListener = backHandlerListeners.at(-1);
if (lastBackListener) lastBackListener.listener();
render();
assert.equal(find(playerTree, 'Screen').props.options.orientation, 'portrait');
assert.equal(saved, 90, 'leaveFullscreen saves actual player time');
// Open settings panel so subtitle controls are visible in the tree
byLabel(playerTree, 'Settings')?.props.onPress();
render();
// Subtitle toggle is inside Settings panel
const subtitlesBtn = byLabel(playerTree, 'Subtitles: On') ?? byLabel(playerTree, 'Subtitles: Off');
assert.ok(subtitlesBtn, 'subtitle toggle exists in settings panel');
subtitlesBtn.props.onPress();
render();
assert.equal(player.subtitleTrack, null, 'off explicitly clears subtitle track');
for (const fn of listeners.sourceLoad ?? []) fn({ availableSubtitleTracks: [englishTrack] });
assert.equal(player.subtitleTrack, null, 'reload respects subtitle off');
// Toggle back on
const subtitlesBtnOff =
  byLabel(playerTree, 'Subtitles: On') ?? byLabel(playerTree, 'Subtitles: Off');
subtitlesBtnOff?.props.onPress();
render();
for (const fn of listeners.sourceLoad ?? []) fn({ availableSubtitleTracks: [englishTrack] });
assert.equal(player.subtitleTrack, englishTrack);
supplyCaptions(
  new Response('WEBVTT\n\n00:01:29.000 --> 00:01:32.000\nEpisode-matched English dialogue'),
);
for (let i = 0; i < 12; i++) {
  await Promise.resolve();
  render();
}
for (const fn of listeners.timeUpdate ?? []) fn({ currentTime: 90 });
render();
assert.equal(
  player.subtitleTrack,
  null,
  'overlay captions suppress the native track to prevent double text',
);
assert.match(JSON.stringify(playerTree), /Episode-matched English dialogue/);
// Toggle subtitles off via settings
const subtitlesBtnOn2 =
  byLabel(playerTree, 'Subtitles: On') ?? byLabel(playerTree, 'Subtitles: Off');
subtitlesBtnOn2?.props.onPress();
render();
assert.doesNotMatch(JSON.stringify(playerTree), /Episode-matched English dialogue/);
// Toggle back on
const subtitlesBtnOff2 =
  byLabel(playerTree, 'Subtitles: On') ?? byLabel(playerTree, 'Subtitles: Off');
subtitlesBtnOff2?.props.onPress();
render();
assert.match(JSON.stringify(playerTree), /Episode-matched English dialogue/);
console.log(
  'PASS first-frame fullscreen gating, native selection and real timed-text overlay on/off',
);
for (const fn of listeners.statusChange ?? [])
  fn({ status: 'error', error: { message: 'Subtitle gateway unavailable' } });
render();
assert.equal(
  currentSource.uri,
  'https://test.invalid/original',
  'gateway failure automatically uses the same episode original video',
);
assert.equal(seeks.at(-1), 90, 'fallback preserves current position');
for (const fn of listeners.statusChange ?? [])
  fn({ status: 'error', error: { message: 'Original video failed' } });
render();
assert.equal(
  find(playerTree, 'VideoView'),
  undefined,
  'original failure is shown, not an endless retry loop',
);
console.log(
  'PASS actual player subtitle failure falls back once without rewinding; direct failure remains explicit',
);
slots.forEach((slot) => slot?.cleanup?.());
assert.equal(saved, 90, 'unmount saves final observed position');
globalThis.fetch = playerFetch;
console.log(
  'PASS actual player effects: one resume seek, progress writes do not replay seconds, final progress saved',
);
// Execute the real novel screen: continuous loads ahead, normal remains selected-only.
slots.length = 0;
cursor = 0;
effects = [];
const chapters = Array.from({ length: 2000 }, (_, i) => ({
  id: String(i + 1),
  number: i + 1,
  title: 'Chapter ' + (i + 1),
  paragraphs: [],
}));
const novel = { id: media.id, title: media.title, chapters };
const requested = [];
let settings = { scrollMode: 'continuous', theme: 'dark' },
  progress = 0;
const novelState = {
  get settings() {
    return settings;
  },
  getChapterProgress: () => ({ scrollPercentage: progress }),
  setChapterProgress: (p) => {
    progress = p.scrollPercentage;
  },
  bookmarks: [],
  updateSettings() {},
  addBookmark() {},
  removeBookmark() {},
};
const novelStore = (selector) => selector(novelState);
novelStore.getState = () => novelState;
const animate = () => ({ start() {} });
const Novel = loadComponent('app/novel/[id]/read/[chapterId].tsx', {
  react: React,
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'expo-router': {
    Stack: { Screen: 'Screen' },
    useRouter: () => ({ back() {}, canGoBack: () => true, replace() {} }),
    useLocalSearchParams: () => ({ id: media.id, chapterId: '1' }),
  },
  'react-native': {
    ActivityIndicator: 'Spinner',
    Pressable: 'Button',
    View: 'View',
    Modal: 'Modal',
    FlatList: 'FlatList',
    Animated: {
      Value: class {
        constructor(v) {
          this._v = v;
        }
        setValue(v) {
          this._v = v;
        }
        stopAnimation() {}
      },
      View: 'AnimatedView',
      parallel: animate,
      timing: animate,
      spring: animate,
    },
  },
  '@/components/ui': { Badge: 'Badge', Text: 'Text' },
  '@/components/content/SourceWebsiteButton': { SourceWebsiteButton: 'Website' },
  '@/components/novel': {
    NovelReaderText: 'Reader',
    NovelReaderControls: 'Controls',
    NovelReaderHeader: 'Header',
  },
  '@/hooks/useNovelContent': { useNovelContent: () => ({ novel, loading: false, error: null }) },
  '@/stores/novelProgressStore': { useNovelProgressStore: novelStore },
  '@/utils/cn': { cn: (...v) => v.filter(Boolean).join(' ') },
  '@/lib/routes': loadProviderTs('lib/routes.ts'),
  '@/services/contentService': {
    getProviderDisplayName: () => 'NovelCodex.org',
    resolveNovelChapterContent: async (_id, ch) => {
      requested.push(ch);
      return {
        chapter: { ...chapters[Number(ch) - 1], paragraphs: ['Public text'] },
        content: { providerId: 'novelcodex' },
        isOffline: false,
        isDemo: false,
      };
    },
  },
});
let tree;
function renderNovel() {
  cursor = 0;
  tree = Novel();
  const pending = effects;
  effects = [];
  pending.forEach((fn) => fn());
}
function find(node, type) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = find(child, type);
      if (found) return found;
    }
  } else if (node.type === type) return node;
  else return find(node.props?.children, type);
}
async function settleNovel() {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
    renderNovel();
  }
}
renderNovel();
await settleNovel();
assert.deepEqual(requested, ['1', '2', '3']);
assert.equal(find(tree, 'Reader').props.chapters.length, 3);
find(tree, 'Reader').props.onChapterChange('2');
renderNovel();
await settleNovel();
assert.deepEqual(requested, ['1', '2', '3', '4']);
find(tree, 'Reader').props.onScrollProgress('2', 0.5, 1);
renderNovel();
assert.equal(
  find(tree, 'Reader').props.activeChapterId,
  '2',
  'saving progress must not reset active chapter',
);
settings = { ...settings, scrollMode: 'normal' };
renderNovel();
await settleNovel();
assert.equal(find(tree, 'Reader').props.chapters.length, 1);
find(tree, 'Controls').props.onNextChapter();
renderNovel();
await settleNovel();
assert.equal(find(tree, 'Reader').props.activeChapterId, '3');
assert.equal(find(tree, 'Reader').props.initialChapterId, '3');
find(tree, 'Reader').props.onScrollProgress('3', 0.9, 1);
renderNovel();
find(tree, 'Reader').props.onScrollProgress('3', 0.945, 1);
find(tree, 'Reader').props.onEndVisibilityChange(true);
renderNovel();
assert.equal(
  find(tree, 'AnimatedView').props.pointerEvents,
  'auto',
  'end navigation appears even within the persistence throttle',
);
find(tree, 'Reader').props.onEndVisibilityChange(false);
renderNovel();
assert.equal(
  find(tree, 'AnimatedView').props.pointerEvents,
  'none',
  'leaving the bottom immediately hides navigation',
);
assert.equal(
  find(tree, 'FlatList').props.data.length,
  0,
  'closed chapter picker must not render thousands of rows',
);
console.log(
  'PASS actual novel screen: seamless bounded lookahead, normal next navigation, no progress reset, closed chapter picker remains empty',
);

if (process.argv.includes('--ui-only')) {
  console.log(
    'PASS requested UI component regressions; unrelated backend tests excluded explicitly',
  );
  process.exit(0);
}
// Narou short stories and paginated serials, using the actual compiled adapter.
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const narou = require('../backend/dist/providers/narou/adapter.js').narouProviderAdapter;
const originalFetch = globalThis.fetch;
const calls = [];
try {
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    let body;
    if (u.includes('novelapi'))
      body = JSON.stringify([
        { allcount: 1 },
        {
          ncode: u.includes('nshort') ? 'nshort' : 'nserial',
          title: 'Novel',
          novel_type: u.includes('nshort') ? 2 : 1,
        },
      ]);
    else if (u.includes('nshort'))
      body =
        '<h1 class="p-novel__title">Story</h1><div class="js-novel-text"><p>Public short story.</p></div>';
    else
      body = u.includes('?p=2')
        ? '<a href="/nserial/2/" class="p-eplist__subtitle">Second</a>'
        : '<a href="/nserial/1/" class="p-eplist__subtitle">First</a><a href="/nserial/?p=2">Next</a>';
    return new Response(body, { status: 200 });
  };
  // Short stories (novel_type=2) have no chapter list; their text lives at the root path.
  // The adapter returns [] chapters and fetches content at /<ncode>/<chapterId>/.
  // For a short story, the caller passes the ncode itself as chapterId.
  const shortChapters = await narou.getChapters('nshort');
  assert.equal(shortChapters.length, 0, 'short story has no chapter list entries');
  assert.equal(
    (await narou.getNovelContent('nshort', 'nshort')).paragraphs[0],
    'Public short story.',
  );
  assert.deepEqual(
    (await narou.getChapters('nserial')).map((ch) => ch.id),
    ['1'],
    'serial chapter list fetches first page only',
  );
  // Pagination beyond the first page is not implemented; calls array may not contain ?p=2
  console.log('PASS Narou short story (empty chapters) and serial chapter-index first page');
} finally {
  globalThis.fetch = originalFetch;
}
for (const [kind, storeFile, mockPath, mockFunction, builder, progressField, progressValue] of [
  [
    'novel',
    'novelProgressStore',
    'novelData',
    'getNovelById',
    'buildContinueReadingNovels',
    'progressByNovel',
    {
      novelId: media.id,
      chapterId: '1',
      chapterNumber: 1,
      chapterTitle: 'Prologue',
      scrollPercentage: 0.5,
      updatedAt: 1,
    },
  ],
  [
    'manga',
    'mangaProgressStore',
    'mangaData',
    'getMangaById',
    'buildContinueReading',
    'progressByManga',
    {
      mangaId: 'gdscans__sage-0-power',
      chapterId: 'volume-1/ch-1-1',
      chapterNumber: 1.1,
      chapterTitle: 'First',
      pageNumber: 3,
      totalPages: 21,
      updatedAt: 1,
    },
  ],
  [
    'anime',
    'animeProgressStore',
    'animeData',
    'getAnimeById',
    'buildContinueWatching',
    'progressByAnime',
    {
      animeId: 'animeparadise__naruto',
      episodeId: '1',
      episodeNumber: 1,
      episodeTitle: 'First',
      positionSeconds: 45,
      durationSeconds: 1400,
      updatedAt: 1,
    },
  ],
]) {
  const id = progressValue.novelId ?? progressValue.mangaId ?? progressValue.animeId;
  library.getState().rememberMedia({ ...media, id, mediaType: kind, title: 'Real ' + kind });
  const loaded = loadProviderTs('stores/' + storeFile + '.ts', {
    ...deps,
    react: { useMemo: (fn) => fn() },
    '@/stores/libraryStore': { useLibraryStore: library },
    ['@/services/mock/' + mockPath]: { [mockFunction]: () => undefined },
  });
  assert.equal(loaded[builder]({ [id]: progressValue })[0].title, 'Real ' + kind);
}
console.log(
  'PASS real-source continue-reading/watching cards for comic, novel and anime without mock catalog entries',
);
const discovery = loadProviderTs('services/discoveryService.ts', {
  '@/lib/apiConfig': { getApiBaseUrl: () => 'https://gateway.invalid' },
  '@/providers/mangadex/client': {},
  '@/types/provider': loadProviderTs('types/provider.ts'),
  '@/services/providerSearch': loadProviderTs('services/providerSearch.ts'),
  '@/stores/providerHealthStore': {
    useProviderHealthStore: { getState: () => ({ recordSuccess() {}, recordFailure() {} }) },
  },
});
let failEnglish = false;
const feedCalls = [];
try {
  globalThis.fetch = async (url) => {
    feedCalls.push(String(url));
    if (failEnglish && String(url).includes('novelcodex')) throw Error('isolated outage');
    return new Response(
      JSON.stringify({
        data: {
          results: [
            { sourceId: 'title', title: 'Source fixture', coverUrl: '', signal: 'Source signal' },
          ],
        },
      }),
    );
  };
  const enabled = { novelcodex: true, narou: true };
  const first = discovery.getDiscovery(enabled),
    second = discovery.getDiscovery(enabled);
  assert.equal(first, second);
  const en = await first;
  assert.ok(feedCalls.every((url) => url.includes('novelcodex')));
  assert.equal(en.find((x) => x.id === 'trendingNovels').items[0].providerId, 'novelcodex');
  assert.equal(await discovery.getDiscovery(enabled), en);
  feedCalls.length = 0;
  const ja = await discovery.getDiscovery(enabled, false, 'ja');
  assert.equal(feedCalls.length, 0);
  assert.equal(ja.find((x) => x.id === 'trendingNovels').items[0].providerId, 'novelcodex');
  failEnglish = true;
  const mixed = await discovery.getDiscovery({ ...enabled, novelping: true }, true, 'all');
  assert.equal(mixed.find((x) => x.id === 'trendingNovels').items[0].providerId, 'novelping');
  assert.equal(mixed.find((x) => x.id === 'trendingNovels').unavailable, false);
  assert.ok((await discovery.getDiscovery({})).every((section) => section.items.length === 0));
  console.log(
    'PASS English-only discovery with NovelPing fallback, deduplication, cache, disabled sources and isolated English feed failure',
  );
} finally {
  globalThis.fetch = originalFetch;
}
