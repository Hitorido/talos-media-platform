import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import ts from 'typescript';
import { loadProviderTs } from './phase6.5-test-loader.mjs';
const require = createRequire(import.meta.url);
const jpeg = require('jpeg-js');
const pixels = new Uint8Array(24 * 24 * 4);
for (let i = 0; i < pixels.length; i += 4) {
  pixels[i] = 240;
  pixels[i + 1] = 32;
  pixels[i + 2] = 24;
  pixels[i + 3] = 255;
}
const encoded = new Uint8Array(jpeg.encode({ width: 24, height: 24, data: pixels }, 100).data);
const large = new Uint8Array(
  jpeg.encode({ width: 101, height: 101, data: new Uint8Array(101 * 101 * 4) }, 80).data,
);
const code = ts.transpileModule(fs.readFileSync('services/coverSample.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const palette = loadProviderTs('services/coverPalette.ts');
for (const file of Object.keys(require.cache))
  if (file.includes('jpeg-js')) delete require.cache[file];
const originalDecoder = globalThis.TextDecoder,
  originalBuffer = globalThis.Buffer;
try {
  globalThis.TextDecoder = class {
    constructor(encoding = 'utf-8') {
      if (encoding !== 'utf-8') throw new RangeError('Unknown encoding: ' + encoding);
      return new originalDecoder(encoding);
    }
  };
  globalThis.Buffer = undefined;
  assert.throws(() => new TextDecoder('latin1'), /Unknown encoding/);
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(
    (name) => (name === 'jpeg-js' ? require(name) : palette),
    module,
    module.exports,
  );
  const color = module.exports.coverSampleColor(encoded);
  assert.match(color, /^#[a-f0-9]{6}$/);
  assert.ok(parseInt(color.slice(1, 3), 16) > 225);
  assert.ok(parseInt(color.slice(3, 5), 16) < 45);
  assert.throws(() => module.exports.coverSampleColor(new Uint8Array([1, 2, 3])));
  assert.throws(() => module.exports.coverSampleColor(new Uint8Array(65537)), /size/);
  assert.throws(() => module.exports.coverSampleColor(large), /maxResolution|too large/);
} finally {
  globalThis.TextDecoder = originalDecoder;
  globalThis.Buffer = originalBuffer;
}
for (const file of [
  'app/anime/[id]/index.tsx',
  'app/manga/[id]/index.tsx',
  'app/manga/[id]/read/[chapterId].tsx',
  'app/novel/[id]/index.tsx',
  'app/novel/[id]/read/[chapterId].tsx',
])
  assert.match(fs.readFileSync(file, 'utf8'), /export default function/);
assert.ok(!fs.readFileSync('components/content/CoverVignette.tsx', 'utf8').includes('fast-png'));
console.log(
  'PASS cover decoder imports and extracts color with UTF-8-only TextDecoder and no Buffer; corrupt/oversized samples reject; affected routes retain default exports',
);
