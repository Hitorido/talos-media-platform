import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const path = require.resolve('expo-router/build/fork/useLinking.native.js');
const version = require('expo-router/package.json').version;
const marker = '// Talos: defer initial-link notifications until mount.';
let source = readFileSync(path, 'utf8');
if (source.includes(marker)) {
  console.log('Expo Router initial-link patch already applied');
} else {
  if (version !== '57.0.15')
    throw new Error('Review initial-link patch for Expo Router ' + version);
  const anchor = '    const getInitialState = (0, react_1.useCallback)(() => {';
  const call =
    'onUnhandledLinking((0, extractPathFromURL_1.extractExpoPathFromURL)(prefixes, url));';
  const start = source.indexOf(anchor);
  const end = source.indexOf('    (0, react_1.useEffect)(() => {', start);
  const block = source.slice(start, end);
  if (start < 0 || end < 0 || block.split(call).length !== 3)
    throw new Error('Router patch contract changed');
  const helper = `    ${marker}
    const initialLinkLifecycle = (0, react_1.useRef)({ mounted: false, disposed: false, pending: undefined });
    const notifyInitialLink = (path) => {
        const lifecycle = initialLinkLifecycle.current;
        if (lifecycle.disposed) return;
        if (lifecycle.mounted) onUnhandledLinking(path);
        else lifecycle.pending = path;
    };
    (0, react_1.useEffect)(() => {
        const lifecycle = initialLinkLifecycle.current;
        lifecycle.mounted = true;
        lifecycle.disposed = false;
        if (lifecycle.pending !== undefined) {
            const path = lifecycle.pending;
            lifecycle.pending = undefined;
            onUnhandledLinking(path);
        }
        return () => { lifecycle.mounted = false; lifecycle.disposed = true; };
    }, [onUnhandledLinking]);
`;
  source =
    source.slice(0, start) +
    helper +
    block.replaceAll(call, call.replace('onUnhandledLinking(', 'notifyInitialLink(')) +
    source.slice(end);
  writeFileSync(path, source);
  console.log('Applied Expo Router initial-link mount fix');
}
