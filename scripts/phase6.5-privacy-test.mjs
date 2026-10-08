import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadProviderTs } from './phase6.5-test-loader.mjs';
const require = createRequire(import.meta.url),
  storage = new Map();
const persistence = {
  appPersistStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
};
let authResult = { success: true },
  resolveAuth;
const platform = { OS: 'android' };
const deps = {
  '@/stores/dialogStore': { appAlert: { alert() {} } },
  zustand: require('zustand'),
  'zustand/middleware': require('zustand/middleware'),
  'react-native': {
    Platform: platform,
    AppState: { currentState: 'active' },
    Alert: { alert() {} },
  },
  'expo-local-authentication': {
    getEnrolledLevelAsync: async () => 2,
    SecurityLevel: { NONE: 0 },
    authenticateAsync: async () => authResult,
  },
  './persistStorage': persistence,
};
const privacy = loadProviderTs('stores/privacyStore.ts', deps);
assert.equal(await privacy.unlockPrivate(), false);
assert.equal(await privacy.unlockPrivate(true), true);
privacy.usePrivacyStore.getState().lock();
assert.equal(privacy.usePrivacyStore.getState().unlocked, false);
authResult = { success: false };
assert.equal(await privacy.unlockPrivate(), false);
deps['expo-local-authentication'].authenticateAsync = () =>
  new Promise((resolve) => (resolveAuth = resolve));
const pending = privacy.unlockPrivate();
await Promise.resolve();
privacy.usePrivacyStore.getState().lock();
resolveAuth({ success: true });
assert.equal(await pending, false, 'background lock invalidates a pending authentication');
const fresh = loadProviderTs('stores/privacyStore.ts', deps);
assert.equal(fresh.usePrivacyStore.getState().unlocked, false);
const common = {
  zustand: require('zustand'),
  'zustand/middleware': require('zustand/middleware'),
  react: { useMemo: (fn) => fn() },
  '@/stores/privacyStore': privacy,
  '@/stores/persistStorage': persistence,
  '@/hooks/useHiddenPrivateIds': { useHiddenPrivateIds: () => new Set() },
  '@/stores/libraryStore': { useLibraryStore: () => ({}) },
  '@/services/mock/mangaData': { getMangaById: () => null },
  '@/services/mock/animeData': { getAnimeById: () => null },
  '@/services/mock/novelData': { getNovelById: () => null },
};
for (const [file, name, action, key, idfield] of [
  [
    'mangaProgressStore',
    'useMangaProgressStore',
    'setChapterProgress',
    'progressByManga',
    'mangaId',
  ],
  [
    'animeProgressStore',
    'useAnimeProgressStore',
    'setEpisodeProgress',
    'progressByAnime',
    'animeId',
  ],
  [
    'novelProgressStore',
    'useNovelProgressStore',
    'setChapterProgress',
    'progressByNovel',
    'novelId',
  ],
]) {
  const store = loadProviderTs('stores/' + file + '.ts', common)[name];
  privacy.usePrivacyStore.getState().setIncognito(true);
  store.getState()[action]({ [idfield]: 'private-test' });
  assert.equal(store.getState()[key]['private-test'], undefined);
  privacy.usePrivacyStore.getState().setIncognito(false);
  store.getState()[action]({ [idfield]: 'normal-test' });
  assert.ok(store.getState()[key]['normal-test']);
}
const settings = loadProviderTs('stores/settingsStore.ts', common).useSettingsStore;
privacy.usePrivacyStore.getState().setIncognito(true);
settings.getState().addSearchHistory('hidden-query');
assert.ok(!settings.getState().searchHistory.includes('hidden-query'));
const library = loadProviderTs('stores/libraryStore.ts', common).useLibraryStore;
assert.deepEqual(library.getState().tags, ['Favorites', 'Private']);
const { dominantColor } = loadProviderTs('services/coverPalette.ts');
assert.equal(
  dominantColor([255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 255, 0, 0], 4),
  '#ff0000',
);
console.log(
  'PASS private setup/cancel/relock/race/recreation; incognito suppresses all progress and search writes; default tags; dominant cover color',
);

// A locked route never renders the protected reader/player child.
const fs = await import('node:fs'),
  ts = await import('typescript');
const jsx = (type, props) => ({ type, props });
let appStateCallback;
const gateModule = { exports: {} };
const code = ts.default.transpileModule(
  fs.readFileSync('components/content/PrivacyControls.tsx', 'utf8'),
  {
    compilerOptions: {
      module: ts.default.ModuleKind.CommonJS,
      target: ts.default.ScriptTarget.ES2022,
      jsx: ts.default.JsxEmit.ReactJSX,
    },
  },
).outputText;
let hidden = new Set(['private-route']);
const gateDeps = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  react: { useEffect: (fn) => fn() },
  'react-native': {
    View: 'View',
    Switch: 'Switch',
    AppState: {
      addEventListener: (_, fn) => {
        appStateCallback = fn;
        return { remove() {} };
      },
    },
  },
  'expo-router': {
    useLocalSearchParams: () => ({ id: 'private-route' }),
    useRouter: () => ({ push() {}, back() {} }),
  },
  '@/components/ui': { Button: 'Button', Text: 'Text' },
  '@/stores/privacyStore': privacy,
  '@/hooks/useHiddenPrivateIds': { useHiddenPrivateIds: () => hidden },
};
new Function('require', 'module', 'exports', code)(
  (name) => gateDeps[name],
  gateModule,
  gateModule.exports,
);
const child = { type: 'protected-reader' };
assert.notEqual(gateModule.exports.PrivacyAccessGate({ children: child }).props.children, child);
hidden = new Set();
assert.equal(gateModule.exports.PrivacyAccessGate({ children: child }).props.children, child);
gateModule.exports.PrivacyLifecycle();
privacy.usePrivacyStore.setState({ unlocked: true });
appStateCallback('background');
assert.equal(privacy.usePrivacyStore.getState().unlocked, false);
console.log('PASS private route gate withholds protected content and app background relocks');
