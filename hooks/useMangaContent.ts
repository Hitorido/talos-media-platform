import { useLibraryStore } from '@/stores/libraryStore';
import { useEffect, useState } from 'react';

import {
  getBuiltinMangaDetails,
  getMediaChapters,
  getMediaDetails,
} from '@/services/contentService';
import type { MangaChapter, MangaDetails } from '@/types/manga';
import type { NormalizedChapter, NormalizedMedia } from '@/types/provider';
import { encodeMediaRouteId } from '@/types/provider';

function toMangaDetails(media: NormalizedMedia, chapters: NormalizedChapter[]): MangaDetails {
  const routeId = encodeMediaRouteId(media.ref.providerId, media.ref.sourceId);
  const formatLabel =
    media.mediaType === 'manhwa'
      ? 'Manhwa'
      : media.mediaType === 'manhua'
        ? 'Manhua'
        : 'Manga';
  const genres =
    media.genres.length > 0
      ? media.genres.includes(formatLabel)
        ? media.genres
        : [formatLabel, ...media.genres]
      : [formatLabel];

  return {
    id: routeId,
    title: media.title,
    description: media.description ?? '',
    coverUrl: media.coverUrl,
    bannerUrl: media.bannerUrl ?? media.coverUrl,
    genres,
    status: media.status === 'completed' ? 'completed' : 'ongoing',
    author: media.author ?? 'Unknown',
    artist: media.artist ?? 'Unknown',
    rating: media.rating ?? 0,
    chapters: chapters.map(
      (chapter): MangaChapter => ({
        id: chapter.id,
        number: chapter.number,
        title: chapter.title,
        releaseDate: chapter.releaseDate ?? '',
        pageCount: chapter.pageCount ?? 0,
        pages: [],
        language: chapter.language || 'en',
        scanlationGroup: chapter.scanlationGroup,
      }),
    ),
  };
}

type MangaContentState = {
  manga: MangaDetails | null;
  loading: boolean;
  error: string | null;
  isProviderContent: boolean;
};

export function useMangaContent(routeId: string | undefined): MangaContentState {
  const [state, setState] = useState<MangaContentState>({
    manga: routeId ? (getBuiltinMangaDetails(routeId) ?? null) : null,
    loading: Boolean(routeId && !getBuiltinMangaDetails(routeId)),
    error: null,
    isProviderContent: Boolean(routeId && !getBuiltinMangaDetails(routeId)),
  });

  useEffect(() => {
    if (!routeId) {
      setState({ manga: null, loading: false, error: null, isProviderContent: false });
      return;
    }

    const builtin = getBuiltinMangaDetails(routeId);
    if (builtin) {
      setState({
        manga: builtin,
        loading: false,
        error: null,
        isProviderContent: false,
      });
      return;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null, isProviderContent: true }));

    Promise.all([getMediaDetails(routeId), getMediaChapters(routeId)])
      .then(([media, chapters]) => {
        if (cancelled) return;
        useLibraryStore.getState().rememberMedia({
          id: encodeMediaRouteId(media.ref.providerId, media.ref.sourceId), title:media.title, coverUrl:media.coverUrl,
          bannerUrl:media.bannerUrl ?? media.coverUrl, genres:media.genres,
          mediaType:media.mediaType === 'manhwa' || media.mediaType === 'manhua' ? media.mediaType : 'manga',
          chapterCount:chapters.length,
        });
        setState({
          manga: toMangaDetails(media, chapters),
          loading: false,
          error: null,
          isProviderContent: true,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to load manga.';
        setState({
          manga: null,
          loading: false,
          error: message,
          isProviderContent: true,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [routeId]);

  return state;
}
