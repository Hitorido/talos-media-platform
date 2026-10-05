import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadProviderTs } from './phase6.5-test-loader.mjs';
const { groupSearchResults } = loadProviderTs('services/searchGrouping.ts');
const card = (id, title, type = 'manga', comicFormat) => ({
  id,
  providerId: id.split('__')[0],
  sourceId: id,
  title,
  type,
  comicFormat,
});
const input = [
  card('a__1', 'One Piece'),
  card('b__1', 'ONE PIECE', 'manga', 'manga'),
  card('c__2', 'One Piece 2'),
  card('d__1', 'One Piece', 'anime'),
  card('e__1', 'One Piece', 'novel'),
];
const groups = groupSearchResults(input);
assert.equal(groups.length, 4);
assert.deepEqual(
  groups[0].sources.map((x) => x.id),
  ['a__1', 'b__1'],
);
assert.equal(groupSearchResults([input[0], input[0]])[0].sources.length, 1);
assert.equal(input.length, 5);
console.log(
  'PASS title grouping: source routes preserved, duplicate records removed, sequels and media types separate',
);
if (process.argv.includes('--live')) {
  const require = createRequire(import.meta.url);
  const adapters = [
    require('../backend/dist/providers/manhuaplus/adapter.js').manhuaPlusAdapter,
    require('../backend/dist/providers/wanderinginn/adapter.js').wanderingInnAdapter,
  ];
  for (const [index, a] of adapters.entries()) {
    await assert.rejects(() => a.getDetails('../invalid'));
    const results = await a.search(index ? 'wandering' : 'apotheosis');
    assert.ok(results.length);
    const id = results[0].sourceId,
      details = await a.getDetails(id),
      chapters = await a.getChapters(id);
    assert.ok(chapters.length > 10);
    assert.equal(new Set(chapters.map((c) => c.id)).size, chapters.length);
    if (a.getPages) {
      await assert.rejects(() => a.getPages(id, 'chapter-unlisted'));
      const pages = await a.getPages(id, chapters[0].id);
      assert.ok(pages.length);
      assert.deepEqual(
        pages.map((p) => p.pageNumber),
        pages.map((_, i) => i + 1),
      );
      for (const page of [pages[0], pages[Math.floor(pages.length / 2)], pages.at(-1)]) {
        const response = await fetch(page.imageUrl, { signal: AbortSignal.timeout(20000) });
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type'), /^image\//);
        await response.arrayBuffer();
      }
      console.log(
        'PASS',
        details.title,
        chapters.length,
        'chapters',
        pages.length,
        'pages and sampled image bytes',
      );
    } else {
      await assert.rejects(() => a.getNovelContent(id, 'unlisted'));
      const content = await a.getNovelContent(id, chapters[0].id);
      assert.ok(content.paragraphs.length > 10);
      assert.equal(content.nextChapterId, chapters[1].id);
      console.log(
        'PASS',
        details.title,
        chapters.length,
        'chapters',
        content.paragraphs.length,
        'paragraphs',
      );
    }
  }
}

// Exercise the real history row's gesture callbacks: left, short, and cancelled swipes retain it.
const ts = await import('typescript');
const fs = await import('node:fs');
const module = { exports: {} };
const jsx = (type, props) => ({ type, props });
const callbacks = {};
const pan = {};
for (const name of ['activeOffsetX', 'failOffsetY', 'onUpdate', 'onEnd', 'onFinalize'])
  pan[name] = (value) => {
    callbacks[name] = value;
    return pan;
  };
let shared;
const deps = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native-gesture-handler': { Gesture: { Pan: () => pan }, GestureDetector: 'Gesture' },
  'react-native-reanimated': {
    default: { View: 'Animated' },
    useSharedValue: (value) =>
      (shared = {
        value,
        get() {
          return this.value;
        },
        set(v) {
          this.value = v;
        },
      }),
    useAnimatedStyle: (fn) => fn(),
    withTiming: (v) => v,
    runOnJS: (fn) => fn,
  },
  'react-native': { View: 'View' },
  '@/components/ui/PopPressable': { PopPressable: 'Pressable' },
  'expo-symbols': { SymbolView: 'Symbol' },
  '@/components/ui': { Button: 'Button', Text: 'Text' },
  '@/utils/cn': { cn: () => '' },
};
const code = ts.default.transpileModule(
  fs.readFileSync('components/search/SearchHistoryList.tsx', 'utf8'),
  {
    compilerOptions: {
      module: ts.default.ModuleKind.CommonJS,
      jsx: ts.default.JsxEmit.ReactJSX,
      target: ts.default.ScriptTarget.ES2022,
    },
  },
).outputText;
new Function('require', 'module', 'exports', code)(
  (name) => {
    assert.ok(name in deps, name);
    return deps[name];
  },
  module,
  module.exports,
);
let removed = [];
const tree = module.exports.SearchHistoryList({
  history: ['test'],
  onSelect() {},
  onRemove: (value) => removed.push(value),
  onClear() {},
});
const findRow = (node) => {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'function') return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const row = findRow(child);
    if (row) return row;
  }
};
const row = findRow(tree);
assert.ok(row);
row.type(row.props);
assert.equal(callbacks.activeOffsetX, 18);
assert.deepEqual(callbacks.failOffsetY, [-12, 12]);
for (const [distance, success] of [
  [-120, true],
  [50, true],
  [120, false],
]) {
  callbacks.onUpdate({ translationX: distance });
  callbacks.onEnd({}, success);
  callbacks.onFinalize();
  assert.equal(shared.get(), 0);
}
assert.deepEqual(removed, []);
callbacks.onUpdate({ translationX: 100 });
callbacks.onEnd({}, true);
assert.deepEqual(removed, ['test']);
console.log(
  'PASS real history swipe: right threshold deletes, left/short/cancelled gestures retain, finalize resets',
);
