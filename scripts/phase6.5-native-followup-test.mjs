import babel from '@babel/core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProviderTs } from './phase6.5-test-loader.mjs';
const output = babel.transformFileSync('components/manga/ZoomablePage.tsx', {
  configFile: false,
  babelrc: false,
  plugins: [
    ['@babel/plugin-transform-typescript', { isTSX: true }],
    'react-native-worklets/plugin',
  ],
}).code;
const closures = [...output.matchAll(/\.__closure = (\{[^}]*\})/g)].map((m) => m[1]);
assert.ok(closures.some((c) => c.includes('viewportHeight') && c.includes('scale')));
assert.ok(
  closures.every((c) => !c.includes('zoom') && !c.includes('gesture')),
  'native worklets must not serialize Gesture instances',
);
const { parseSubtitleCues, subtitleAt } = loadProviderTs('services/subtitleCues.ts');
const cues = parseSubtitleCues(
  'WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000 align:center\n<i>Hello</i> &amp; welcome\n\n00:00:02.500 --> 00:00:04.000\nSecond line',
);
assert.equal(subtitleAt(cues, 0), '');
assert.equal(subtitleAt(cues, 1), 'Hello & welcome');
assert.equal(subtitleAt(cues, 2.7), 'Hello & welcome\nSecond line');
assert.equal(subtitleAt(cues, 4), '');
assert.equal(
  subtitleAt(cues, 1.2),
  'Hello & welcome',
  'backward seeking selects earlier cue again',
);
assert.equal(parseSubtitleCues('1\n00:01:02,300 --> 00:01:03,100\nSRT')[0].start, 62.3);
console.log(
  'PASS Babel-generated shared-value-only worklet closures and timed caption parsing/seeking',
);

const ts = await import('typescript');
const compile = (path, deps) => {
  const m = { exports: {} };
  const code = ts.default.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: {
      module: ts.default.ModuleKind.CommonJS,
      target: ts.default.ScriptTarget.ES2022,
      jsx: ts.default.JsxEmit.ReactJSX,
    },
  }).outputText;
  new Function('require', 'module', 'exports', code)(
    (name) => {
      if (!(name in deps)) throw Error(name);
      return deps[name];
    },
    m,
    m.exports,
  );
  return m.exports;
};
const jsx = (type, props) => ({ type, props });
const React = {
  forwardRef: (fn) => fn,
  useCallback: (fn) => fn,
  useRef: (value) => ({ current: value }),
  useImperativeHandle() {},
};
const { NovelReaderText } = compile('components/novel/NovelReaderText.tsx', {
  react: React,
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': { ScrollView: 'Scroll', View: 'View' },
  '@/components/ui': { Text: 'Text' },
  '@/utils/cn': { cn: () => '' },
});
const visibility = [];
const tree = NovelReaderText(
  {
    chapters: [{ id: 'one', number: 1, title: 'One', paragraphs: ['Text'] }],
    activeChapterId: 'one',
    settings: {
      theme: 'dark',
      fontFamily: 'sans',
      fontSize: 18,
      margin: 'medium',
      lineSpacing: 'normal',
    },
    onScrollProgress() {},
    onChapterChange() {},
    onEndVisibilityChange: (v) => visibility.push(v),
  },
  null,
);
tree.props.onLayout({ nativeEvent: { layout: { height: 500 } } });
tree.props.onContentSizeChange(400, 1200);
const event = (y) => ({
  nativeEvent: {
    contentOffset: { y },
    layoutMeasurement: { height: 500 },
    contentSize: { height: 1200 },
  },
});
tree.props.onScroll(event(700));
assert.equal(visibility.at(-1), true);
tree.props.onScroll(event(640));
assert.equal(visibility.at(-1), false);
tree.props.onMomentumScrollEnd(event(700));
assert.equal(visibility.at(-1), true);
tree.props.onScrollEndDrag(event(640));
assert.equal(visibility.at(-1), false);
tree.props.onContentSizeChange(400, 300);
assert.equal(visibility.at(-1), true, 'short chapters expose navigation without needing a scroll');
console.log(
  'PASS actual novel scroll: immediate bottom visibility, fast/slow departure, momentum completion and short chapters',
);

const z = await import('zustand'),
  middleware = await import('zustand/middleware');
const memory = new Map();
const storeDeps = {
  zustand: z,
  'zustand/middleware': middleware,
  '@/stores/persistStorage': {
    appPersistStorage: {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, value),
      removeItem: (key) => memory.delete(key),
    },
  },
  react: { useMemo: (fn) => fn() },
  '@/stores/libraryStore': { useLibraryStore: { getState: () => ({ media: {} }) } },
  '@/services/mock/mangaData': { getMangaById() {} },
  '@/hooks/useHiddenPrivateIds': { useHiddenPrivateIds: () => new Set() },
  '@/stores/privacyStore': { usePrivacyStore: { getState: () => ({ incognito: false }) } },
};
const firstStore = loadProviderTs('stores/mangaProgressStore.ts', storeDeps).useMangaProgressStore;
firstStore.getState().setReadingMode('comic-one', 'horizontal');
firstStore.getState().setReadingMode('comic-two', 'vertical');
const nextStore = loadProviderTs('stores/mangaProgressStore.ts', storeDeps).useMangaProgressStore;
await nextStore.persist.rehydrate();
assert.equal(nextStore.getState().readingModes['comic-one'], 'horizontal');
assert.equal(nextStore.getState().readingModes['comic-two'], 'vertical');
console.log('PASS independent per-title reading modes survive store recreation');
const slots = [];
let cursor = 0;
const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => v === b[i]);
const stableReact = {
  useRef: (value) => {
    const i = cursor++;
    return slots[i] ?? (slots[i] = { current: value });
  },
  useMemo: (fn, deps) => {
    const i = cursor++;
    if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: fn() };
    return slots[i].value;
  },
  useCallback: (fn, deps) => stableReact.useMemo(() => fn, deps),
  useEffect: (fn) => {
    fn();
  },
};
let count = 0;
const recognizer = () => {
  count++;
  let proxy;
  proxy = new Proxy({}, { get: () => () => proxy });
  return proxy;
};
const gesture = {
  Native: recognizer,
  Pinch: recognizer,
  Tap: recognizer,
  Pan: recognizer,
  Simultaneous: (...g) => ({ g }),
  Exclusive: (...g) => ({ g }),
};
const animated = {
  useSharedValue: (value) => stableReact.useRef(value),
  useAnimatedRef: () => stableReact.useRef(null),
  useAnimatedScrollHandler: (fn) => fn,
  useAnimatedStyle: (fn) => fn(),
  useAnimatedReaction() {},
  cancelAnimation() {},
  scrollTo() {},
  withTiming: (v) => v,
  withDecay: (v) => v,
  runOnJS: (fn) => fn,
  interpolate: (v, _i, _o) => v,
  Easing: { out: (fn) => fn, cubic: (v) => v, inOut: (fn) => fn, in: (fn) => fn, linear: (v) => v },
};
const { useReaderZoom } = loadProviderTs('components/manga/useReaderZoom.ts', {
  react: stableReact,
  'react-native-gesture-handler': { Gesture: gesture },
  'react-native-reanimated': animated,
});
cursor = 0;
const firstZoom = useReaderZoom(400, 700, () => {});
const previousCount = count;
cursor = 0;
const rerendered = useReaderZoom(400, 700, () => {});
assert.equal(rerendered.gesture, firstZoom.gesture);
assert.equal(
  count,
  previousCount,
  'page-progress rerenders cannot recreate taps between fingers down/up',
);
console.log('PASS actual zoom hook keeps gesture identity across changed React callbacks');

const realReact = await import('react');
let expanded = false,
  opened = 0;
const { HorizontalSection } = compile('components/home/HorizontalSection.tsx', {
  react: {
    ...realReact,
    useState: () => [
      expanded,
      (value) => {
        expanded = value;
      },
    ],
  },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': { Modal: 'Modal', ScrollView: 'Scroll', View: 'View' },
  '@/components/home/SectionHeader': { SectionHeader: 'Header' },
  '@/components/ui': { Button: 'Button', Screen: 'Screen', Text: 'Text' },
  '@/utils/cn': { cn: () => '' },
});
const nodes = (node, type) =>
  !node
    ? []
    : Array.isArray(node)
      ? node.flatMap((n) => nodes(n, type))
      : [...(node.type === type ? [node] : []), ...nodes(node.props?.children, type)];
const card = realReact.createElement('Card', { onPress: () => opened++ });
const renderSection = () => HorizontalSection({ title: 'Trending', children: [card] });
let section = renderSection();
nodes(section, 'Header')[0].props.onActionPress();
section = renderSection();
const modal = nodes(section, 'Modal')[0];
assert.equal(modal.props.visible, true);
nodes(modal, 'Card')[0].props.onPress();
assert.equal(opened, 1);
assert.equal(
  nodes(renderSection(), 'Modal')[0].props.visible,
  false,
  'See all closes before navigating to details',
);
console.log('PASS actual See All modal opens, navigates and dismisses');
