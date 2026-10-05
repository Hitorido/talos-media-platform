import type { SearchResult } from '@/types/search';
export type SearchGroup = { id: string; title: string; sources: SearchResult[] };
/** Presentation grouping only: source records and their routes remain separate. */
export function groupSearchResults(results: SearchResult[]): SearchGroup[] {
  const groups = new Map<string, SearchGroup>();
  for (const item of results) {
    const key = searchTitleKey(item);
    const group = groups.get(key) ?? { id: key, title: item.title, sources: [] };
    if (!group.sources.some((source) => source.id === item.id)) group.sources.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** Same display title and media format; aliases and sequel numbers are not inferred. */
export function searchTitleKey(
  item: Pick<SearchResult, 'id' | 'title' | 'type' | 'comicFormat'>,
): string {
  const title = item.title
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
  return `${item.type}:${item.comicFormat ?? (item.type === 'manga' ? 'manga' : '')}:${title || item.id}`;
}
