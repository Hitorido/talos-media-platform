import { loadOfflineCatalog } from '@/services/offlineCatalog';
import { useLibraryStore } from '@/stores/libraryStore';
import { useEffect, useMemo, useState } from 'react';

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
    media.mediaType === 'manhwa' ? 'Manhwa' : media.mediaType === 'manhua' ? 'Manhua' : 'Manga';
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
    chapters: chapters.map((chapter): MangaChapter => ({
      id: chapter.id,
      number: chapter.number,
      title: chapter.title,
      releaseDate: chapter.releaseDate ?? '',
      pageCount: chapter.pageCount ?? 0,
      pages: [],
      language: chapter.language || 'en',
      scanlationGroup: chapter.scanlationGroup,
    })),
    mediaType:
      media.mediaType === 'manhwa' || media.mediaType === 'manhua' ? media.mediaType : 'manga',
  };
}

type MangaContentState = {
  manga: MangaDetails | null;
  loading: boolean;
  error: string | null;
  isProviderContent: boolean;
};

const EMPTY_MANGA_STATE: MangaContentState = {
  manga: null,
  loading: false,
  error: null,
  isProviderContent: false,
};

const PENDING_MANGA_STATE: MangaContentState = {
  manga: null,
  loading: true,
  error: null,
  isProviderContent: true,
};

export function useMangaContent(routeId: string | undefined): MangaContentState {
  const builtin = useMemo(() => (routeId ? getBuiltinMangaDetails(routeId) : null), [routeId]);

  // Resolved payloads are tagged with the route they belong to. That lets the
  // hook derive "no route", "builtin title" and "still loading" during render
  // instead of cascading synchronous setState from the effect body — one less
  // render pass on every details screen open.
  const [resolved, setResolved] = useState<{ key: string; state: MangaContentState } | null>(null);

  useEffect(() => {
    if (!routeId || builtin) return;
    const key = routeId;

    let cancelled = false;
    let fresh = false;
    let local: MangaDetails | null = null;
    const localReady = loadOfflineCatalog('manga', routeId)
      .then((saved) => {
        local = saved;
        if (saved && !cancelled && !fresh)
          setResolved({
            key,
            state: { manga: saved, loading: false, error: null, isProviderContent: true },
          });
      })
      .catch(() => {});

    Promise.all([getMediaDetails(routeId), getMediaChapters(routeId)])
      .then(([media, chapters]) => {
        if (cancelled) return;
        fresh = true;
        // Prefer detail cover; fall back to any saved library cover so Shadow Slave
        // (and similar titles) do not show blank on the detail screen.
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
          mediaType:
            media.mediaType === 'manhwa' || media.mediaType === 'manhua'
              ? media.mediaType
              : 'manga',
          chapterCount: chapters.length,
        });
        setResolved({
          key,
          state: {
            manga: toMangaDetails(
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
        const message = error instanceof Error ? error.message : 'Failed to load manga.';
        setResolved({
          key,
          state: {
            manga: local,
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
    if (!routeId) return EMPTY_MANGA_STATE;
    if (builtin) return { manga: builtin, loading: false, error: null, isProviderContent: false };
    if (resolved?.key === routeId) return resolved.state;
    return PENDING_MANGA_STATE;
  }, [routeId, builtin, resolved]);
}
