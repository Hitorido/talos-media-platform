import type {
  MediaRef,
  NormalizedChapter,
  NormalizedEpisode,
  NormalizedMedia,
  NormalizedNovelContent,
  NormalizedPage,
  NormalizedPlaybackSource,
  ProviderCapability,
  ProviderDefinition,
  ProviderMediaType,
} from '@/types/provider';
import type { SearchFilter, SearchResult } from '@/types/search';

export type ProviderSearchContext = {
  filter: SearchFilter;
  limit?: number;
};

export interface MediaProvider {
  definition: ProviderDefinition;
  search(query: string, context: ProviderSearchContext): Promise<SearchResult[]>;
  getDetails?(ref: MediaRef): Promise<NormalizedMedia>;
  getChapters?(ref: MediaRef): Promise<NormalizedChapter[]>;
  getChapterPages?(ref: MediaRef, chapterId: string): Promise<NormalizedPage[]>;
  getEpisodes?(ref: MediaRef): Promise<NormalizedEpisode[]>;
  getPlaybackSource?(ref: MediaRef, episodeId: string): Promise<NormalizedPlaybackSource>;
  getNovelContent?(ref: MediaRef, chapterId: string): Promise<NormalizedNovelContent>;
}

export function providerSupports(
  provider: MediaProvider,
  capability: ProviderCapability,
  mediaType?: ProviderMediaType,
): boolean {
  if (!provider.definition.capabilities.includes(capability)) {
    return false;
  }

  if (mediaType && !provider.definition.mediaTypes.includes(mediaType)) {
    return false;
  }

  return true;
}
