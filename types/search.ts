import type { ComicFormat, ContentType } from '@/types/content';

export type SearchFilter = 'all' | ContentType | 'manhwa' | 'manhua';

export type SearchResult = {
  id: string;
  providerId: string;
  sourceId: string;
  title: string;
  coverUrl: string;
  type: ContentType;
  /** When type is manga, distinguishes manga / manhwa / manhua. */
  comicFormat?: ComicFormat;
  subtitle: string;
  tags: string[];
};

export type SearchResponse = {
  results: SearchResult[];
  query: string;
  filter: SearchFilter;
};
