import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const source = readFileSync(require.resolve('expo-router/build/fork/useLinking.native.js'), 'utf8');
const begin = source.indexOf('    // Talos: defer');
const end = source.indexOf('    const getInitialState', begin);
function harness() {
  let mount;
  const calls = [];
  const react_1 = {
    useRef: (current) => ({ current }),
    useEffect: (fn) => {
      mount = fn;
    },
  };
  const notify = new Function(
    'react_1',
    'onUnhandledLinking',
    source.slice(begin, end) + '\nreturn notifyInitialLink;',
  )(react_1, (path) => calls.push(path));
  return { notify, mount: () => mount(), calls };
}
const h = harness();
h.notify('/manga/test');
assert.deepEqual(h.calls, []);
const dispose = h.mount();
assert.deepEqual(h.calls, ['/manga/test']);
h.notify('/novel/test');
assert.equal(h.calls.length, 2);
dispose();
h.notify('/late');
assert.equal(h.calls.length, 2);
h.mount();
assert.equal(h.calls.length, 2);
const abandoned = harness();
await Promise.resolve().then(() => abandoned.notify('/abandoned'));
assert.deepEqual(abandoned.calls, []);
console.log(
  'PASS initial links wait for mount, deliver once, and ignore late unmounted resolutions',
);
