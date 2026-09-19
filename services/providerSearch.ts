// Shared across overlapping searches: obsolete requests retain their slot until settled.
let activeSearches = 0;
const waiting: (() => void)[] = [];
export async function inSearchSlot<T>(run: () => Promise<T>): Promise<T> {
  if (activeSearches >= 3) await new Promise<void>(resolve => waiting.push(resolve));
  else activeSearches++;
  try { return await run(); }
  finally {
    const next = waiting.shift();
    if (next) next();
    else activeSearches--;
  }
}

/** Keep actual provider operations within the cap; do not race uncancelled work. */
export async function settleProviderSearches<T, R>(items: T[], run: (item: T) => Promise<R>, concurrency = 3): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      try { results[index] = { status: 'fulfilled', value: await run(items[index]) }; }
      catch (reason) { results[index] = { status: 'rejected', reason }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(items.length, Math.max(1, Math.floor(concurrency) || 1)) }, worker));
  return results;
}

/** Conservative source suggestions: sequels and similarly named series are not matches. */
export function sameComicTitle(a: string, b: string): boolean {
  const normalize = (value: string) => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const title = normalize(a);
  return title.length > 0 && title === normalize(b);
}

/** Abort the real transport, retaining its concurrency slot until it settles. */
export async function searchRequest<T>(parent: AbortSignal | undefined, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (parent?.aborted) abort();
  else parent?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 20_000);
  try { return await run(controller.signal); }
  finally { clearTimeout(timer); parent?.removeEventListener('abort', abort); }
}
