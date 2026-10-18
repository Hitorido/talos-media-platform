import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const slots = [];
let cursor = 0;
const react = {
  useState(initial) {
    const i = cursor++;
    if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
    return [
      slots[i],
      (value) => {
        slots[i] = typeof value === 'function' ? value(slots[i]) : value;
      },
    ];
  },
  useRef(initial) {
    const i = cursor++;
    if (!(i in slots)) slots[i] = { current: initial };
    return slots[i];
  },
  useCallback: (fn) => fn,
  useMemo: (fn) => fn(),
  useEffect: () => {},
};
const jsx = (type, props) => ({ type, props });
const deleted = [];
const opened = [];
const deps = {
  react,
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': {
    View: 'View',
    Pressable: 'Pressable',
    ScrollView: 'ScrollView',
    Animated: {
      View: 'Animated',
      Value: class {
        setValue() {}
      },
      spring: () => ({ start() {}, stop() {} }),
    },
    Easing: {},
    PanResponder: { create: (callbacks) => ({ panHandlers: callbacks }) },
  },
  'expo-router': { useFocusEffect() {} },
  'expo-video': {},
  '@/components/ui': { Text: 'Text' },
  '@/services/api/client': {},
  '@/services/contentService': {},
  '@/components/ui/Text': { Text: 'Text' },
  '@/services/downloadService': {
    deleteDownload: (id) => deleted.push(id),
    pauseDownload() {},
    resumeDownload() {},
    retryDownload() {},
  },
};
const module = { exports: {} };
new Function(
  'require',
  'module',
  'exports',
  ts.transpileModule(fs.readFileSync('components/content/CategoryHighlight.tsx', 'utf8'), {
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

const items = Array.from({ length: 12 }, (_, i) => ({
  id: String(i),
  title: `Title ${i}`,
  coverUrl: '',
}));
function render(list = items) {
  cursor = 0;
  return module.exports.CategoryHighlight({
    items: list,
    category: 'manga',
    onOpen: (item) => opened.push(item.id),
  });
}
function nodes(tree) {
  return !tree || typeof tree !== 'object'
    ? []
    : Array.isArray(tree)
      ? tree.flatMap(nodes)
      : [tree, ...nodes(tree.props?.children)];
}
const dots = (tree) =>
  nodes(tree).filter((n) => n.props?.accessibilityLabel?.startsWith('Highlight '));
const swipe = (tree, dx) =>
  nodes(tree)
    .find((n) => n.props?.onPanResponderRelease)
    .props.onPanResponderRelease(null, { dx });
let tree = render();
assert.equal(dots(tree).length, 10);
assert.equal(dots(tree)[0].props.accessibilityState.selected, true);
swipe(tree, -80);
tree = render();
assert.equal(dots(tree)[9].props.accessibilityState.selected, true);
swipe(tree, 80);
tree = render();
assert.equal(dots(tree)[0].props.accessibilityState.selected, true);
dots(tree)[4].props.onPress();
tree = render();
assert.equal(dots(tree)[4].props.accessibilityState.selected, true);
const card = nodes(tree).find((n) => n.props?.accessibilityLabel?.startsWith('Open '));
card.props.onPressIn();
card.props.onPress();
assert.equal(opened.length, 1);
assert.equal(dots(render(items.slice(0, 3))).length, 3);
assert.equal(render([]), null);
console.log('Highlight ten-title cap, bidirectional wrap, dots, tap and sparse feeds PASS');
