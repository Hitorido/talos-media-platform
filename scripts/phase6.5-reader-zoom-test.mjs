import assert from 'node:assert/strict';
import { loadProviderTs } from './phase6.5-test-loader.mjs';

const gestures = [];
const timings = [];
const scrolls = [];
const reactionWatchers = [];

const shared = (v) => {
  let value = v;
  return {
    get value() {
      return value;
    },
    set value(n) {
      if (n === value) return;
      const old = value;
      value = n;
      for (const watcher of reactionWatchers) watcher();
      void old;
    },
  };
};

const native = {
  cancelAnimation: () => {},
  useAnimatedStyle: (fn) => fn(),
  useSharedValue: (v) => shared(v),
  useAnimatedRef: () => ({ current: {} }),
  useAnimatedReaction: (read, fn) => {
    let previous = null;
    const watcher = () => {
      const next = read();
      if (previous === null || next !== previous) {
        const prev = previous;
        previous = next;
        fn(next, prev);
      }
    };
    previous = read();
    reactionWatchers.push(watcher);
  },
  useAnimatedScrollHandler: (fn) => fn,
  scrollTo: (_ref, _x, y) => scrolls.push(y),
  withTiming: (value, config, cb) => {
    timings.push(config?.duration);
    if (cb) queueMicrotask(() => cb(true));
    return value;
  },
  withDecay: (config, cb) => {
    if (cb) queueMicrotask(() => cb(true));
    return config;
  },
  Easing: { out: () => ({}), cubic: {} },
  interpolate: (v, input, output) => {
    const t = input[0] === input[1] ? 1 : (v - input[0]) / (input[1] - input[0]);
    return output[0] + (output[1] - output[0]) * Math.min(1, Math.max(0, t));
  },
  runOnJS: (fn) => fn,
};

function recognizer(kind) {
  const g = { kind };
  for (const name of [
    'requireExternalGestureToFail',
    'manualActivation',
    'maxPointers',
    'simultaneousWithExternalGesture',
    'numberOfTaps',
    'maxDelay',
    'maxDistance',
    'activeOffsetX',
    'failOffsetY',
  ]) {
    g[name] = (value) => {
      g[name + 'Value'] = value;
      return g;
    };
  }
  for (const name of [
    'onBegin',
    'onTouchesDown',
    'onTouchesMove',
    'onStart',
    'onUpdate',
    'onEnd',
    'onFinalize',
  ]) {
    g[name] = (fn) => {
      g[name + 'Fn'] = fn;
      return g;
    };
  }
  gestures.push(g);
  return g;
}

const Gesture = {
  Native: () => recognizer('native'),
  Pinch: () => recognizer('pinch'),
  Tap: () => recognizer('tap'),
  Pan: () => recognizer('pan'),
  Simultaneous: (...args) => args,
  Exclusive: (...args) => args,
};

const { useReaderZoom } = loadProviderTs('components/manga/useReaderZoom.ts', {
  react: {
    useEffect: (fn) => { fn(); },
    useMemo: (fn) => fn(),
    useRef: (value) => ({ current: value }),
    useCallback: (fn) => fn,
  },
  'react-native-gesture-handler': { Gesture },
  'react-native-reanimated': native,
});

let taps = 0;
const zoom = useReaderZoom(400, 700, () => taps++);
const pinch = gestures.find((g) => g.kind === 'pinch');
const double = gestures.find((g) => g.numberOfTapsValue === 2);
const tap = gestures.find((g) => g.kind === 'tap' && g.numberOfTapsValue !== 2);

zoom.scrollHandler({ contentOffset: { y: 1000 } });
pinch.onStartFn({ focalX: 200, focalY: 350 });
pinch.onUpdateFn({ scale: 2 });
pinch.onFinalizeFn();
assert.equal(zoom.scale.value, 2);
assert.equal(zoom.x.value, 0, 'pinch stays centered horizontally');
assert.equal(scrolls.at(-1), 1175, 'pinch preserves screen-center content point');

double.onEndFn({ x: 300, y: 200 }, true);
assert.equal(zoom.scale.value, 1, 'manual zoom first fits');
await Promise.resolve();

zoom.scrollHandler({ contentOffset: { y: 0 } });
double.onEndFn({ x: 300, y: 200 }, true);
assert.equal(zoom.scale.value, 2);
assert.equal(zoom.x.value, -100, 'double tap anchors at the pressed x coordinate');
assert.equal(scrolls.at(-1), 100, 'double tap anchors at the pressed y coordinate');
assert.ok(timings.includes(280));
assert.equal(taps, 0, 'double tap does not invoke single-tap controls');
tap.onEndFn({}, true);
assert.equal(taps, 1);

pinch.onStartFn({ focalX: 200, focalY: 350 });
pinch.onUpdateFn({ scale: 0.01 });
assert.equal(zoom.scale.value, 0.5);
pinch.onFinalizeFn();
assert.equal(zoom.scale.value, 0.5, 'release preserves manual zoom-out without a surprise zoom');
double.onEndFn({ x: 200, y: 200 }, true);
assert.equal(zoom.scale.value, 1, 'double tap first restores fit from manual zoom-out');
double.onEndFn({ x: 200, y: 200 }, true);
assert.equal(zoom.scale.value, 2, 'double tap from fit zooms in');
double.onEndFn({ x: 200, y: 200 }, true);
assert.equal(zoom.scale.value, 1, 'double tap from zoomed fits again');

pinch.onStartFn({ focalX: 300, focalY: 250 });
pinch.onUpdateFn({ scale: 2 });
pinch.onFinalizeFn();
assert.equal(zoom.x.value, -100, 'pinch follows focal x');
assert.equal(zoom.scale.value, 2);
pinch.onStartFn({ focalX: 300, focalY: 250 });
pinch.onUpdateFn({ scale: 0.25 });
pinch.onFinalizeFn();
assert.equal(zoom.x.value, 0, 'below fit recenters');
console.log(
  'PASS actual native zoom hook: focal pinch, tap-coordinate anchoring, smooth timing, fit cycle, bounds and separate single tap',
);

const fs = await import('node:fs');
const source = fs.readFileSync('components/manga/VerticalReader.tsx', 'utf8');
assert.equal((source.match(/useReaderZoom\(/g) || []).length, 1);
assert.match(source, /zoom.viewportStyle/);
assert.doesNotMatch(source, /<ZoomablePage/);
assert.match(source, /height:\s*0/);
console.log(
  'PASS webtoon list owns one viewport zoom controller instead of independently resizing page rows',
);

const pan = gestures.find((g) => g.kind === 'pan');
zoom.scale.value = 1;
let failed = 0;
pan.onTouchesDownFn(
  { numberOfTouches: 1, allTouches: [{ x: 10, y: 10 }] },
  {
    fail() {
      failed++;
    },
  },
);
assert.equal(failed, 1, 'fit-size horizontal swipes must reach pager');

let pinchTapRejected = 0;
double.onTouchesDownFn(
  { numberOfTouches: 2 },
  {
    fail() {
      pinchTapRejected++;
    },
  },
);
tap.onTouchesDownFn(
  { numberOfTouches: 2 },
  {
    fail() {
      pinchTapRejected++;
    },
  },
);
assert.equal(pinchTapRejected, 2, 'two-finger pinch must never become a double tap');
console.log('PASS gesture arbitration keeps unzoomed paging and rejects multi-touch taps');
