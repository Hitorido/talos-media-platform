import { Image } from 'react-native';

const ratios = new Map<string, number>();
const pending = new Map<string, Promise<void>>();
let running = 0;
const queue: (() => void)[] = [];
export function getPageRatio(url: string, fallback = 0.67) {
  return ratios.get(url) ?? fallback;
}
export function rememberPageRatio(url: string, width: number, height: number) {
  if (!(width > 0 && height > 0)) return;
  ratios.set(url, width / height);
  if (ratios.size > 1500) ratios.delete(ratios.keys().next().value!);
}
/** Warm the native image cache and dimensions with three actual requests at a time. */
export function preloadPage(url: string): Promise<void> {
  if (!url || ratios.has(url)) return Promise.resolve();
  const existing = pending.get(url);
  if (existing) return existing;
  const task = new Promise<void>((resolve) => {
    const start = () => {
      running++;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        running--;
        pending.delete(url);
        resolve();
        queue.shift()?.();
      };
      Image.getSize(
        url,
        (width, height) => {
          rememberPageRatio(url, width, height);
          if (/^https?:/.test(url)) void Image.prefetch(url).then(finish, finish);
          else finish();
        },
        finish,
      );
    };
    if (running < 3) start();
    else queue.push(start);
  });
  pending.set(url, task);
  return task;
}
