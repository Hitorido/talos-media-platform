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
