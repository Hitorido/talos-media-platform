import type { ComicFormat, ContentType } from '@/types/content';

export type SearchFilter = 'all' | ContentType | 'manhwa' | 'manhua';

export type SearchResult = {
  id: string;
  providerId: string;
  sourceId: string;
  title: string;
  alternativeTitles?: string[];
  relatedIds?: string[];
  editionLabel?: string;
  coverUrl: string;
  type: ContentType;
  /** When type is manga, distinguishes manga / manhwa / manhua. */
  comicFormat?: ComicFormat;
  subtitle: string;
  tags: string[];
  /** Catalog counts only when supplied by the search response; not necessarily unlocked. */
  language?: string;
  chapterCount?: number;
  episodeCount?: number;
  status?: string;
  /** Whether the content is marked as mature/adult */
  isMature?: boolean;
};

export type SearchResponse = {
  results: SearchResult[];
  query: string;
  filter: SearchFilter;
};
