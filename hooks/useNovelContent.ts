import { loadOfflineCatalog } from '@/services/offlineCatalog';
import { useLibraryStore } from '@/stores/libraryStore';
import { useEffect, useState } from 'react';

import {
  getBuiltinNovelDetails,
  getMediaChapters,
  getMediaDetails,
} from '@/services/contentService';
import type { NovelChapter, NovelDetails } from '@/types/novel';
import type { NormalizedChapter, NormalizedMedia } from '@/types/provider';
import { encodeMediaRouteId } from '@/types/provider';

function toNovelDetails(media: NormalizedMedia, chapters: NormalizedChapter[]): NovelDetails {
  const routeId = encodeMediaRouteId(media.ref.providerId, media.ref.sourceId);

  return {
    id: routeId,
    language: media.language,
    title: media.title,
    altTitles: media.alternativeTitles,
    description: media.description ?? '',
    coverUrl: media.coverUrl,
    bannerUrl: media.bannerUrl ?? media.coverUrl,
    genres: media.genres.length > 0 ? media.genres : ['Light Novel'],
    status: media.status === 'completed' ? 'completed' : 'ongoing',
    author: media.author ?? 'Unknown',
    rating: media.rating ?? 0,
    chapters: chapters.map((ch): NovelChapter => ({
      id: ch.id,
      number: ch.number,
      title: ch.title,
      releaseDate: ch.releaseDate ?? '',
      wordCount: ch.wordCount ?? 2000,
      paragraphs: [],
    })),
  };
}

type NovelContentState = {
  novel: NovelDetails | null;
  loading: boolean;
  error: string | null;
  isProviderContent: boolean;
};

export function useNovelContent(routeId: string | undefined): NovelContentState {
  const [state, setState] = useState<NovelContentState>({
    novel: routeId ? (getBuiltinNovelDetails(routeId) ?? null) : null,
    loading: Boolean(routeId && !getBuiltinNovelDetails(routeId)),
    error: null,
    isProviderContent: Boolean(routeId && !getBuiltinNovelDetails(routeId)),
  });

  useEffect(() => {
    if (!routeId) {
      setState({ novel: null, loading: false, error: null, isProviderContent: false });
      return;
    }

    const builtin = getBuiltinNovelDetails(routeId);
    if (builtin) {
      setState({
        novel: builtin,
        loading: false,
        error: null,
        isProviderContent: false,
      });
      return;
    }

    let cancelled = false;
    let fresh = false;
    let local: NovelDetails | null = null;
    const localReady = loadOfflineCatalog('novel', routeId)
      .then((saved) => {
        local = saved;
        if (saved && !cancelled && !fresh)
          setState({ novel: saved, loading: false, error: null, isProviderContent: true });
      })
      .catch(() => {});
    setState((current) => ({ ...current, loading: true, error: null, isProviderContent: true }));

    Promise.all([getMediaDetails(routeId), getMediaChapters(routeId)])
      .then(([media, chapters]) => {
        if (cancelled) return;
        fresh = true;
        useLibraryStore.getState().rememberMedia({
          id: encodeMediaRouteId(media.ref.providerId, media.ref.sourceId),
          title: media.title,
          coverUrl: media.coverUrl,
          bannerUrl: media.bannerUrl ?? media.coverUrl,
          genres: media.genres,
          mediaType: 'novel',
          chapterCount: chapters.length,
        });
        setState({
          novel: toNovelDetails(media, chapters),
          loading: false,
          error: null,
          isProviderContent: true,
        });
      })
      .catch(async (error: unknown) => {
        await localReady;
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to load novel details.';
        setState({
          novel: local,
          loading: false,
          error: local ? null : message,
          isProviderContent: true,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [routeId]);

  return state;
}
