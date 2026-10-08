import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const interactive = new Set([
  'Pressable',
  'PopPressable',
  'SurfacePressable',
  'TouchableOpacity',
  'Button',
  'Link',
  'AnimatedPressable',
]);
const violations = [];
function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const path = directory + '/' + entry.name;
    if (entry.isDirectory()) {
      scan(path);
      continue;
    }
    if (!path.endsWith('.tsx')) continue;
    const file = ts.createSourceFile(
      path,
      fs.readFileSync(path, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    function visit(node, parents = []) {
      const element = ts.isJsxElement(node)
        ? node.openingElement
        : ts.isJsxSelfClosingElement(node)
          ? node
          : null;
      const name = element?.tagName.getText(file);
      const action = interactive.has(name);
      if (action && parents.length)
        violations.push(
          `${path}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1} ${parents.join(' > ')} > ${name}`,
        );
      ts.forEachChild(node, (child) =>
        visit(child, action && ts.isJsxElement(node) ? [...parents, name] : parents),
      );
    }
    visit(file);
  }
}
scan('app');
scan('components');
assert.deepEqual(
  violations,
  [],
  'Interactive controls must be siblings, not nested:\n' + violations.join('\n'),
);
console.log('PASS no nested button/link controls across app and components');
