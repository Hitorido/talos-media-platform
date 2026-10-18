import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const effects = [],
  callbacks = {},
  saved = [];
let released = false,
  removed = 0;
const player = {
  get duration() {
    if (released) throw new Error('Shared object released');
    return 120;
  },
  get currentTime() {
    if (released) throw new Error('Shared object released');
    return 25;
  },
  set currentTime(value) {
    if (released) throw new Error('Shared object released');
  },
  play() {},
  addListener(name, fn) {
    callbacks[name] = fn;
    return {
      remove() {
        removed++;
      },
    };
  },
};
const react = {
  useRef: (current) => ({ current }),
  useState: (value) => [value, () => {}],
  useMemo: (fn) => fn(),
  useEffect: (fn) => effects.push(fn),
};
const dependencies = {
  react,
  'react/jsx-runtime': { jsx: () => null, jsxs: () => null },
  'react-native': {
    AppState: {
      addEventListener: () => ({
        remove() {
          removed++;
        },
      }),
    },
  },
  'expo-video': { useVideoPlayer: () => player },
  '@/stores/movieProgressStore': {
    useMovieProgressStore: {
      getState: () => ({ entries: {}, save: (key, value) => saved.push({ key, ...value }) }),
    },
  },
};
const source = fs.readFileSync('app/playback.tsx', 'utf8') + '\nexport { MovieVideo };';
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const module = { exports: {} };
new Function('require', 'module', 'exports', code)(
  (name) => dependencies[name] || {},
  module,
  module.exports,
);
module.exports.MovieVideo({
  payload: {
    streams: [{ url: 'https://example.com/video.m3u8', contentType: 'hls' }],
    subtitles: [],
  },
  progressKey: 'movie:155',
});
const cleanups = effects.map((fn) => fn()).filter(Boolean);
callbacks.statusChange({ status: 'readyToPlay' });
callbacks.timeUpdate({ currentTime: 25 });
released = true;
for (const cleanup of cleanups) assert.doesNotThrow(cleanup);
assert.equal(saved.at(-1).positionSeconds, 25);
assert.equal(saved.at(-1).durationSeconds, 120);
assert.equal(removed, 4);
console.log('Movie player released-before-cleanup progress regression PASS');
