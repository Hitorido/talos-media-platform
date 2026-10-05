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
const grouping = load('services/searchGrouping.ts', {});
const ui = {
  '@/hooks/useDialogEscape': { useDialogEscape() {} },
  '@/components/ui/PopPressable': { PopPressable: 'Pressable' },
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
  '@/services/searchGrouping': grouping,
  '@/hooks/useMediaCover': { useMediaCover: (_, cover) => cover },
  '@/stores/providerStore': {},
  '@/lib/routes': {},
});
const pool = [
  { id: 'a', title: 'Anime', type: 'anime' },
  { id: 'm', title: 'Manga', type: 'manga', comicFormat: 'manga' },
  { id: 'h', title: 'Manhwa', type: 'manga', comicFormat: 'manhwa' },
  { id: 'c', title: 'Manhua', type: 'manga', comicFormat: 'manhua' },
  { id: 'n', title: 'Novel', type: 'novel' },
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
assert.deepEqual(selectSearchSuggestions(pool, [pool[0]], 'all', 'query'), pool.slice(1));
console.log(
  'PASS 100-item range boundaries, explicit status selection/cancel, category and query recommendations',
);

const { SearchResultsList } = load('components/search/SearchResultsList.tsx', {
  react: { useState: (value) => [value, () => {}], useEffect() {}, useMemo: (fn) => fn() },
  '@/services/searchGrouping': grouping,
  '@/components/content/SelectionModal': { SelectionModal: 'Selection' },
  '@/services/contentService': { getProviderDisplayName: (id) => id },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': {
    FlatList: 'FlatList',
    View: 'View',
    useWindowDimensions: () => ({ width: 390 }),
  },
  '@/components/search/SearchResultItem': { SearchResultItem: 'Item' },
  '@/components/ui': { Text: 'Text' },
  '@/services/englishChapterCount': {},
});
const rankedTree = SearchResultsList({
  query: 'test',
  results: [
    { id: 'unknown', title: 'unknown', type: 'anime' },
    { id: 'small', title: 'small', type: 'anime', episodeCount: 12 },
    { id: 'large', title: 'large', type: 'novel', chapterCount: 3198 },
    { id: 'zero', title: 'zero', type: 'manga', chapterCount: 0 },
  ],
});
const ranked = nodes(rankedTree, 'FlatList')[0].props.data;
assert.deepEqual(
  ranked.map((item) => item.sources[0].id),
  ['large', 'small', 'zero', 'unknown'],
);
console.log('PASS descending known counts with unknown counts last');

let opened;
const sourceChoices = [
  { id: 'first__one', providerId: 'first', title: 'Same title', type: 'manga', chapterCount: 10 },
  { id: 'second__two', providerId: 'second', title: 'Same title', type: 'manga', chapterCount: 20 },
];
const { SearchResultsList: WithPicker } = load('components/search/SearchResultsList.tsx', {
  react: {
    useState: (value) => [
      value === null ? grouping.groupSearchResults(sourceChoices)[0] : value,
      () => {},
    ],
    useEffect() {},
    useMemo: (fn) => fn(),
  },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': {
    FlatList: 'FlatList',
    View: 'View',
    useWindowDimensions: () => ({ width: 390 }),
  },
  '@/services/searchGrouping': grouping,
  '@/components/content/SelectionModal': { SelectionModal: 'Selection' },
  '@/services/contentService': { getProviderDisplayName: (id) => id },
  '@/components/search/SearchResultItem': { SearchResultItem: 'Item' },
  '@/components/ui': { Text: 'Text' },
  '@/services/englishChapterCount': {},
});
const choiceTree = WithPicker({
  results: sourceChoices,
  query: 'Same title',
  onResultPress: (item) => (opened = item),
});
assert.equal(nodes(choiceTree, 'FlatList')[0].props.data.length, 1);
const picker = nodes(choiceTree, 'Selection')[0];
assert.deepEqual(
  picker.props.options.map((x) => x.value),
  ['first__one', 'second__two'],
);
picker.props.onSelect('second__two');
assert.equal(opened, sourceChoices[1]);
console.log('PASS grouped card source picker opens the selected original source record');
