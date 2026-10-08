import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { loadProviderTs } from './phase6.5-test-loader.mjs';
const compile = (path, deps) => {
  const m = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
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
function harness(path, name, props) {
  const slots = [];
  let cursor = 0,
    effects = [];
  const ref = { current: null };
  const scrolls = [];
  const scrollY = { value: 0 };
  const list = {
    scrollToOffset(arg) {
      scrolls.push(arg.offset);
      scrollY.value = arg.offset;
    },
    scrollToIndex(arg) {
      scrolls.push(arg.index * 400);
      scrollY.value = arg.index * 400;
    },
  };
  const zoom = {
    scrollRef: { current: list },
    scrollY,
    scale: { value: 1 },
    x: { value: 0 },
    viewportStyle: {},
    gesture: {},
    nativeGesture: {},
  };
  const effect = (fn, deps) => {
    const i = cursor++;
    const before = slots[i];
    if (!before || deps.some((v, n) => v !== before[n])) {
      slots[i] = deps;
      effects.push(fn);
    }
  };
  const react = {
    memo: (f) => f,
    forwardRef: (f) => f,
    useRef(v) {
      const i = cursor++;
      return slots[i] ?? (slots[i] = { current: v });
    },
    useState(v) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = v;
      return [slots[i], (next) => (slots[i] = typeof next === 'function' ? next(slots[i]) : next)];
    },
    useMemo(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((v, n) => v !== slots[i].deps[n]))
        slots[i] = { deps, value: fn() };
      return slots[i].value;
    },
    useCallback(fn, deps) {
      return react.useMemo(() => fn, deps);
    },
    useEffect: effect,
    useLayoutEffect: effect,
    useImperativeHandle(r, fn) {
      r.current = fn();
    },
  };
  const jsx = (type, props) => ({ type, props });
  const deps = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': {
      View: 'View',
      FlatList: 'List',
      useWindowDimensions: () => ({ width: 400, height: 800 }),
    },
    'react-native-gesture-handler': { GestureDetector: 'Gesture' },
    'react-native-reanimated': { __esModule: true, default: { View: 'View', FlatList: 'List' } },
    './ZoomablePage': { FittedPage: 'Page', ZoomablePage: 'Page' },
    './useReaderZoom': { useReaderZoom: () => zoom },
    '@/services/mangaImageCache': { getPageRatio: (_url, fallback) => fallback },
  };
  const Component = compile(path, deps)[name];
  let tree;
  const find = (node, type) => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const child of node) {
        const hit = find(child, type);
        if (hit) return hit;
      }
    } else if (node.type === type) return node;
    else return find(node.props?.children, type);
  };
  const render = () => {
    cursor = 0;
    tree = Component(props, ref);
    const node = find(tree, 'List');
    if (node.props.ref) node.props.ref.current = list;
    const pending = effects;
    effects = [];
    pending.forEach((fn) => fn());
    return node.props;
  };
  return { render, ref, props, scrolls, scrollY };
}
const page = (chapterId, pageNumber) => ({
  chapterId,
  pageNumber,
  imageUrl: `${chapterId}/${pageNumber}`,
  aspectRatio: 1,
});
const chapter = (id, count) => ({
  id,
  number: Number(id),
  title: id,
  pages: Array.from({ length: count }, (_, i) => page(id, i + 1)),
});
const events = [];
const v = harness('components/manga/VerticalReader.tsx', 'VerticalReader', {
  chapters: [chapter('12', 3)],
  activeChapterId: '12',
  initialPage: 2,
  onTapScreen() {},
  onChapterChange() {},
  onPageChange: (...args) => events.push(args),
});
let list = v.render();
const firstRenderer = list.renderItem;
const firstLayout = list.getItemLayout;
list = v.render();
assert.equal(list.renderItem, firstRenderer, 'page updates retain row renderer');
assert.equal(list.getItemLayout, firstLayout, 'unchanged pages retain geometry');
assert.equal(v.scrolls.at(-1), 400);
list.onViewableItemsChanged({ viewableItems: [{ isViewable: true, item: page('12', 2) }] });
v.scrollY.value = 500;
v.props.chapters = [chapter('11', 2), chapter('12', 3), chapter('13', 2)];
list = v.render();
assert.equal(
  v.scrolls.at(-1),
  1300,
  'prepending a chapter preserves page 2 plus its visible fraction',
);
assert.equal(v.ref.current.getLocation().chapterId, '12');
v.ref.current.scrollToChapterPage('13', 1);
assert.equal(v.scrolls.at(-1), 2000);
list.onViewableItemsChanged({ viewableItems: [{ isViewable: true, item: page('11', 1) }] });
assert.equal(events.length, 0, 'outgoing callbacks cannot replace pending destination');
const h = harness('components/manga/HorizontalReader.tsx', 'HorizontalReader', {
  pages: [page('12', 1), page('12', 2)],
  activeChapterId: '12',
  initialPage: 1,
  direction: 'rtl',
  onTapScreen() {},
  onPageChange: (...args) => events.push(args),
});
let horizontal = h.render();
assert.equal(h.scrolls.at(-1), 400);
horizontal.onScroll({ nativeEvent: { contentOffset: { x: 400 } } });
h.props.pages.push(page('13', 1), page('13', 2));
h.props.pages = [...h.props.pages];
horizontal = h.render();
assert.equal(h.scrolls.at(-1), 1200, 'RTL insertion preserves chapter 12 page 1');
console.log(
  'PASS actual vertical/horizontal readers preserve chapter/page across neighbor insertion and ignore stale destination callbacks',
);
const callbacks = [];
let active = 0,
  peak = 0;
const images = loadProviderTs('services/mangaImageCache.ts', {
  'react-native': {
    Image: {
      getSize(url, ok) {
        active++;
        peak = Math.max(peak, active);
        callbacks.push(() => {
          active--;
          ok(800, 1200);
        });
      },
      prefetch: async () => true,
    },
  },
});
const work = Array.from({ length: 12 }, (_, i) =>
  images.preloadPage('https://images.invalid/' + i),
);
assert.equal(callbacks.length, 3);
assert.equal(images.preloadPage('https://images.invalid/0'), work[0]);
while (callbacks.length) {
  callbacks.shift()();
  await new Promise((resolve) => setTimeout(resolve, 0));
}
await Promise.all(work);
assert.equal(peak, 3);
assert.equal(images.getPageRatio('https://images.invalid/0'), 2 / 3);
console.log(
  'PASS whole-chapter image queue, concurrency three, dimensions cache and duplicate coalescing',
);
const { loadReviewedExtensions } = loadProviderTs('backend/src/providers/extensions/loader.ts');
const manifest = JSON.parse(fs.readFileSync('backend/src/providers/extensions/index.json', 'utf8'));
const modules = Object.fromEntries(
  manifest.extensions.map((entry) => [
    entry.id,
    {
      definition: {
        id: entry.id,
        mediaTypes: [
          entry.kind === 'video' ? 'anime' : entry.kind === 'novel' ? 'novel' : 'manhua',
        ],
      },
      search() {},
      getDetails() {},
      getEpisodes() {},
      getPlaybackSource() {},
      getChapters() {},
      getPages() {},
      getNovelContent() {},
    },
  ]),
);
assert.equal(loadReviewedExtensions(manifest, modules).length, 3);
assert.throws(() =>
  loadReviewedExtensions(
    { ...manifest, extensions: [...manifest.extensions, manifest.extensions[0]] },
    modules,
  ),
);
assert.throws(() => loadReviewedExtensions(manifest, {}));
assert.throws(() =>
  loadReviewedExtensions(
    { ...manifest, extensions: [{ ...manifest.extensions[0], runtime: 'remote-js' }] },
    modules,
  ),
);
console.log(
  'PASS reviewed multi-media manifests reject duplicate, unknown and remote runtime modules',
);
