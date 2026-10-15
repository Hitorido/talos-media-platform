import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { loadProviderTs } from './phase6.5-test-loader.mjs';
const slots = [];
let cursor = 0;
const effects = [];
const react = {
  useState(initial) {
    const i = cursor++;
    if (!(i in slots)) slots[i] = initial;
    return [
      slots[i],
      (value) => {
        slots[i] = value;
      },
    ];
  },
  useEffect(fn) {
    const i = cursor++;
    if (!slots[i]) {
      slots[i] = true;
      effects.push(fn);
    }
  },
};
const jsx = (type, props) => ({ type, props });
const calls = [];
const node = (id, format = 'TV') => ({
  id,
  type: 'ANIME',
  format,
  title: { english: `Edition ${id}` },
});
const catalogs = {
  1: {
    ...node(1),
    relations: {
      edges: [
        { relationType: 'SEQUEL', node: node(2, 'MOVIE') },
        { relationType: 'ADAPTATION', node: { ...node(99), type: 'MANGA' } },
      ],
    },
  },
  2: {
    ...node(2, 'MOVIE'),
    relations: {
      edges: [
        { relationType: 'SEQUEL', node: node(3) },
        { relationType: 'SIDE_STORY', node: node(4, 'OVA') },
      ],
    },
  },
};
const deps = {
  react,
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'expo-router': { useRouter: () => ({ replace() {} }) },
  'react-native': { View: 'View' },
  '@/components/ui': { Button: 'Button' },
  './SelectionModal': { SelectionModal: 'Picker' },
  '@/providers/anilist/client': {
    getAniListAnime: async (id) => {
      calls.push(id);
      return catalogs[id];
    },
  },
  '@/types/provider': loadProviderTs('types/provider.ts'),
  '@/lib/routes': loadProviderTs('lib/routes.ts'),
};
const module = { exports: {} };
new Function(
  'require',
  'module',
  'exports',
  ts.transpileModule(fs.readFileSync('components/content/RelatedEditions.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText,
)(
  (name) => {
    assert.ok(name in deps, name);
    return deps[name];
  },
  module,
  module.exports,
);
const render = (routeId) => {
  cursor = 0;
  return module.exports.RelatedEditions({ routeId });
};
render('anilist-anime__1');
effects.splice(0).forEach((fn) => fn());
for (let i = 0; i < 12; i++) await Promise.resolve();
const tree = render('anilist-anime__1');
const picker = tree.props.children.find((child) => child.type === 'Picker');
assert.deepEqual(
  picker.props.options.map((x) => x.value),
  ['anilist-anime__1', 'anilist-anime__2', 'anilist-anime__3', 'anilist-anime__4'],
);
assert.equal(picker.props.value, 'anilist-anime__1');
assert.equal(
  render('animeparadise__other'),
  null,
  'old franchise choices never leak to a new route',
);
assert.deepEqual(calls, ['1', '2']);
console.log(
  'PASS real AniList provider IDs, season/movie/OVA traversal, adaptation exclusion and stale-choice isolation',
);
