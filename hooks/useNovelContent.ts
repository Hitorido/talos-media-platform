import { loadOfflineCatalog } from '@/services/offlineCatalog';
import { useLibraryStore } from '@/stores/libraryStore';
import { useEffect, useMemo, useState } from 'react';

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

const EMPTY_NOVEL_STATE: NovelContentState = {
  novel: null,
  loading: false,
  error: null,
  isProviderContent: false,
};

const PENDING_NOVEL_STATE: NovelContentState = {
  novel: null,
  loading: true,
  error: null,
  isProviderContent: true,
};

export function useNovelContent(routeId: string | undefined): NovelContentState {
  const builtin = useMemo(() => (routeId ? getBuiltinNovelDetails(routeId) : null), [routeId]);

  // Resolved payloads are tagged with the route they belong to, so "no route",
  // "builtin title" and "still loading" are all derived during render rather
  // than cascading synchronous setState from the effect body.
  const [resolved, setResolved] = useState<{ key: string; state: NovelContentState } | null>(null);

  useEffect(() => {
    if (!routeId || builtin) return;
    const key = routeId;

    let cancelled = false;
    let fresh = false;
    let local: NovelDetails | null = null;
    const localReady = loadOfflineCatalog('novel', routeId)
      .then((saved) => {
        local = saved;
        if (saved && !cancelled && !fresh)
          setResolved({
            key,
            state: { novel: saved, loading: false, error: null, isProviderContent: true },
          });
      })
      .catch(() => {});

    Promise.all([getMediaDetails(routeId), getMediaChapters(routeId)])
      .then(([media, chapters]) => {
        if (cancelled) return;
        fresh = true;
        // Prefer detail cover; fall back to any saved library cover so detail
        // screens never show blank when the provider's details response omits cover.
        const savedCover =
          useLibraryStore.getState().media?.[
            encodeMediaRouteId(media.ref.providerId, media.ref.sourceId)
          ]?.coverUrl ??
          local?.coverUrl ??
          '';
        const resolvedCoverUrl = media.coverUrl?.trim() ? media.coverUrl : savedCover;
        const resolvedBannerUrl = (media.bannerUrl ?? media.coverUrl)?.trim()
          ? (media.bannerUrl ?? media.coverUrl)
          : savedCover;
        useLibraryStore.getState().rememberMedia({
          id: encodeMediaRouteId(media.ref.providerId, media.ref.sourceId),
          title: media.title,
          coverUrl: resolvedCoverUrl,
          bannerUrl: resolvedBannerUrl,
          genres: media.genres,
          mediaType: 'novel',
          chapterCount: chapters.length,
        });
        setResolved({
          key,
          state: {
            novel: toNovelDetails(
              { ...media, coverUrl: resolvedCoverUrl, bannerUrl: resolvedBannerUrl },
              chapters,
            ),
            loading: false,
            error: null,
            isProviderContent: true,
          },
        });
      })
      .catch(async (error: unknown) => {
        await localReady;
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to load novel details.';
        setResolved({
          key,
          state: {
            novel: local,
            loading: false,
            error: local ? null : message,
            isProviderContent: true,
          },
        });
      });

    return () => {
      cancelled = true;
    };
  }, [routeId, builtin]);

  return useMemo(() => {
    if (!routeId) return EMPTY_NOVEL_STATE;
    if (builtin) return { novel: builtin, loading: false, error: null, isProviderContent: false };
    if (resolved?.key === routeId) return resolved.state;
    return PENDING_NOVEL_STATE;
  }, [routeId, builtin, resolved]);
}
