import { searchCatalog } from '@/services/mock/searchCatalog';
import type { SearchFilter, SearchResponse } from '@/types/search';

const SEARCH_DELAY_MS = 500;
const ERROR_QUERY = 'error';

function matchesQuery(entry: (typeof searchCatalog)[number], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return false;
  }

  return (
    entry.title.toLowerCase().includes(normalizedQuery) ||
    entry.subtitle.toLowerCase().includes(normalizedQuery) ||
    entry.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
  );
}

function matchesFilter(entry: (typeof searchCatalog)[number], filter: SearchFilter) {
  return filter === 'all' || entry.type === filter;
}

export async function mockSearch(query: string, filter: SearchFilter): Promise<SearchResponse> {
  await new Promise((resolve) => setTimeout(resolve, SEARCH_DELAY_MS));

  const trimmedQuery = query.trim();

  if (trimmedQuery.toLowerCase() === ERROR_QUERY) {
    throw new Error('Search is temporarily unavailable. Please try again.');
  }

  const results = searchCatalog.filter(
    (entry) => matchesQuery(entry, trimmedQuery) && matchesFilter(entry, filter),
  );

  return {
    results,
    query: trimmedQuery,
    filter,
  };
}
