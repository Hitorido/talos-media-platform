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
        slots[i] = value;
      },
    ];
  },
  useRef(initial) {
    const i = cursor++;
    if (!(i in slots)) slots[i] = { current: initial };
    return slots[i];
  },
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
    Animated: { View: 'Animated', Value: class {} },
    Easing: {},
    PanResponder: { create: (callbacks) => ({ panHandlers: callbacks }) },
  },
  '@expo/vector-icons': { Ionicons: 'Icon' },
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
  ts.transpileModule(fs.readFileSync('components/downloads/SavedChapterPager.tsx', 'utf8'), {
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
const items = Array.from({ length: 41 }, (_, i) => ({
  id: String(i + 1),
  unitNumber: i + 1,
  unitTitle: 'Chapter ' + (i + 1),
  mediaType: 'novel',
  status: 'completed',
}));
const render = (list = items) => {
  cursor = 0;
  return module.exports.SavedChapterPager({ items: list, onOpen: (item) => opened.push(item.id) });
};
function nodes(tree) {
  return !tree || typeof tree !== 'object'
    ? []
    : Array.isArray(tree)
      ? tree.flatMap(nodes)
      : [tree, ...nodes(tree.props?.children)];
}
const label = (tree, name) => nodes(tree).find((n) => n.props?.accessibilityLabel === name);
let tree = render();
assert.equal(
  nodes(tree).filter(
    (n) =>
      n.props?.accessibilityLabel?.startsWith('Chapter ') &&
      !n.props.accessibilityLabel.startsWith('Chapter page'),
  ).length,
  20,
);
label(tree, 'Next chapter page').props.onPress();
tree = render();
assert.ok(label(tree, 'Chapter 21'));
assert.equal(label(tree, 'Chapter 1'), undefined);
tree.props.onPanResponderRelease(null, { dx: 80 });
tree = render();
assert.ok(label(tree, 'Chapter 41'));
tree.props.onPanResponderRelease(null, { dx: 80 });
tree = render();
assert.ok(label(tree, 'Chapter 1'));
tree.props.onPanResponderRelease(null, { dx: -80 });
tree = render();
assert.ok(label(tree, 'Chapter 41'));
tree.props.onPanResponderRelease(null, { dx: -80 });
tree = render();
assert.ok(label(tree, 'Chapter 21'));
label(tree, 'Chapter 21').props.onPress();
label(tree, 'Delete Chapter 21').props.onPress();
assert.deepEqual(opened, ['21']);
assert.deepEqual(deleted, ['21']);
tree = render(items.slice(0, 2));
assert.ok(label(tree, 'Chapter 1'));
label(tree, 'Previous chapter page').props.onPress();
tree = render(items.slice(0, 2));
assert.ok(label(tree, 'Chapter 1'));
console.log(
  'PASS actual saved popup: 20 items, right/left paging, bidirectional wraparound, selected open/delete and shrinking catalog',
);
