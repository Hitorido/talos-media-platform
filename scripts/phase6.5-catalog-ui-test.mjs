import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const jsx = (type, props) => ({ type, props });
function load(path, deps) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  new Function('require', 'module', 'exports', code)(
    (name) => {
      if (!(name in deps)) throw Error(name);
      return deps[name];
    },
    module,
    module.exports,
  );
  return module.exports;
}
const ui = {
  react: { useState: (value) => [value, () => {}] },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': {
    Modal: 'Modal',
    Pressable: 'Pressable',
    ScrollView: 'ScrollView',
    View: 'View',
  },
  '@/components/ui': { Text: 'Text' },
};
const { chapterRange, SelectionModal } = load('components/content/SelectionModal.tsx', ui);
const entries = Array.from({ length: 3198 }, (_, i) => i + 1);
assert.deepEqual(chapterRange(entries, 0), entries.slice(0, 100));
assert.deepEqual(chapterRange(entries, 31), entries.slice(3100));
assert.deepEqual(chapterRange(entries, 99), entries.slice(3100));
assert.deepEqual(chapterRange([], 0), []);
let selected,
  closed = 0;
const modal = SelectionModal({
  visible: true,
  title: 'Status',
  options: [
    { value: 'reading', label: 'Reading' },
    { value: 'completed', label: 'Completed' },
  ],
  value: 'reading',
  onSelect: (value) => (selected = value),
  onClose: () => closed++,
});
function nodes(node, type) {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap((x) => nodes(x, type));
  return [...(node.type === type ? [node] : []), ...nodes(node.props?.children, type)];
}
assert.equal(selected, undefined);
const buttons = nodes(modal, 'Pressable');
buttons
  .find(
    (button) =>
      button.props.accessibilityRole === 'radio' && !button.props.accessibilityState.checked,
  )
  .props.onPress();
assert.equal(selected, 'completed');
assert.equal(closed, 1);
selected = undefined;
modal.props.onRequestClose();
assert.equal(selected, undefined, 'dismiss never changes status');
const { selectSearchSuggestions } = load('components/search/SearchSuggestions.tsx', {
  ...ui,
  react: { useState() {}, useEffect() {} },
  'expo-router': {},
  '@/services/discoveryService': {},
  '@/stores/providerStore': {},
  '@/lib/routes': {},
});
const pool = [
  { id: 'a', type: 'anime' },
  { id: 'm', type: 'manga', comicFormat: 'manga' },
  { id: 'h', type: 'manga', comicFormat: 'manhwa' },
  { id: 'c', type: 'manga', comicFormat: 'manhua' },
  { id: 'n', type: 'novel' },
];
for (const [filter, id] of [
  ['anime', 'a'],
  ['manga', 'm'],
  ['manhwa', 'h'],
  ['manhua', 'c'],
  ['novel', 'n'],
])
  assert.deepEqual(
    selectSearchSuggestions(pool, [], filter, ''),
    pool.filter((item) => item.id === id),
  );
assert.equal(selectSearchSuggestions(pool, [], 'all', '').length, 5);
assert.deepEqual(selectSearchSuggestions(pool, [pool[0]], 'all', 'query'), [pool[0]]);
console.log(
  'PASS 100-item range boundaries, explicit status selection/cancel, category and query recommendations',
);

const { SearchResultsList } = load('components/search/SearchResultsList.tsx', {
  react: { useState: () => [{}, () => {}], useEffect() {}, useMemo: (fn) => fn() },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': { FlatList: 'FlatList', View: 'View' },
  '@/components/search/SearchResultItem': { SearchResultItem: 'Item' },
  '@/components/ui': { Text: 'Text' },
  '@/services/englishChapterCount': {},
});
const ranked = SearchResultsList({
  query: 'test',
  results: [
    { id: 'unknown', type: 'anime' },
    { id: 'small', type: 'anime', episodeCount: 12 },
    { id: 'large', type: 'novel', chapterCount: 3198 },
    { id: 'zero', type: 'manga', chapterCount: 0 },
  ],
}).props.data;
assert.deepEqual(
  ranked.map((item) => item.id),
  ['large', 'small', 'zero', 'unknown'],
);
console.log('PASS descending known counts with unknown counts last');
