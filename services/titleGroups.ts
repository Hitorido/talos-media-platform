/** Group source variants without merging differently named sequels or adaptations. */
export function titleKey(title: string, type: string, fallback = '') {
  const text = title
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
  return `${type}:${text && !text.startsWith('savedtitle') ? text : fallback}`;
}
export function groupTitleItems<T>(items: T[], identity: (item: T) => string): T[][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = identity(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}
