import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Lightweight harness — mirrors updateService semver without Expo native modules.
function semverGt(a, b) {
  const parse = (v) =>
    v
      .replace(/[^0-9.]/g, '.')
      .split('.')
      .filter(Boolean)
      .map((part) => Number(part) || 0);
  const av = parse(a);
  const bv = parse(b);
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i += 1) {
    const left = av[i] ?? 0;
    const right = bv[i] ?? 0;
    if (left !== right) return left > right;
  }
  return false;
}

assert.equal(semverGt('0.6.6-beta', '0.6.5-beta'), true);
assert.equal(semverGt('0.6.5-beta', '0.6.5-beta'), false);
assert.equal(semverGt('0.6.5-beta', '0.6.6-beta'), false);
assert.equal(semverGt('1.0.0', '0.9.9'), true);
console.log('PASS update semver comparisons');
