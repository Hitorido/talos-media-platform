import type { SearchResult } from '@/types/search';
import type { NormalizedChapter, NormalizedNovelContent } from '@/types/provider';
import { Platform } from 'react-native';
import { createRoyalRoadAdapter } from '../../backend/src/providers/royalroad/core';
import { createWanderingInnAdapter } from '../../backend/src/providers/wanderinginn/core';
import { nativeSourceText } from './nativeSourceText';
import { withDirectAnimeFallback } from './directAnime';
import type { MediaProvider } from '../types';
import { encodeMediaRouteId } from '@/types/provider';
/** Keep the provider's gateway API on web, and use the same parser directly on native. */
export function withNativeNovel(provider: MediaProvider): MediaProvider {
  const id = provider.definition.id;
  if (Platform.OS === 'web' || !['royalroad', 'wanderinginn'].includes(id)) return provider;
  const adapter = (signal?: AbortSignal) =>
    id === 'royalroad'
      ? createRoyalRoadAdapter(nativeSourceText('https://www.royalroad.com', signal))
      : createWanderingInnAdapter(nativeSourceText('https://wanderinginn.com', signal));
  return {
    definition: {
      ...provider.definition,
      backendRequired: false,
      executionMode: 'direct-api',
      statusNote: 'Native public-page requests with gateway fallback; source access may vary.',
    },
    search: (query, context) =>
      withDirectAnimeFallback<SearchResult[]>(
        async () =>
          (await adapter(context.signal).search!(query)).map((item) => ({
            id: encodeMediaRouteId(id, item.sourceId),
            providerId: id,
            sourceId: item.sourceId,
            title: item.title,
            type: 'novel' as const,
            coverUrl: item.coverUrl ?? '',
            chapterCount: item.chapterCount,
            language: 'en',
            subtitle: provider.definition.name,
            tags: [],
          })),
        () => provider.search(query, context),
        context.signal,
      ),
    getDetails: (ref) =>
      withDirectAnimeFallback(
        async () => {
          const media = await adapter().getDetails!(ref.sourceId);
          return { ...media, ref, genres: media.genres ?? [], coverUrl: media.coverUrl ?? '' };
        },
        () => provider.getDetails!(ref),
      ),
    getChapters: (ref) =>
      withDirectAnimeFallback<NormalizedChapter[]>(
        async () =>
          (await adapter().getChapters!(ref.sourceId)).map((ch) => ({
            ...ch,
            number: ch.chapterNumber,
          })),
        () => provider.getChapters!(ref),
      ),
    getNovelContent: (ref, chapter) =>
      withDirectAnimeFallback<NormalizedNovelContent>(
        async () => {
          const text = await adapter().getNovelContent!(ref.sourceId, chapter);
          return { ...text, novelId: ref.sourceId };
        },
        () => provider.getNovelContent!(ref, chapter),
      ),
  };
}
