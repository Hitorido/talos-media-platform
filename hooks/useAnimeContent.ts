import { loadOfflineCatalog } from '@/services/offlineCatalog';
import { useLibraryStore } from '@/stores/libraryStore';
import { useEffect, useMemo, useState } from 'react';

import {
  getBuiltinAnimeDetails,
  getMediaDetails,
  getMediaEpisodes,
} from '@/services/contentService';
import type { AnimeDetails, AnimeEpisode } from '@/types/anime';
import type { NormalizedEpisode, NormalizedMedia } from '@/types/provider';
import { encodeMediaRouteId } from '@/types/provider';

function toAnimeDetails(media: NormalizedMedia, episodes: NormalizedEpisode[]): AnimeDetails {
  const routeId = encodeMediaRouteId(media.ref.providerId, media.ref.sourceId);

  return {
    id: routeId,
    title: media.title,
    altTitles: media.alternativeTitles,
    description: media.description ?? '',
    coverUrl: media.coverUrl,
    bannerUrl: media.bannerUrl ?? media.coverUrl,
    genres: media.genres.length > 0 ? media.genres : ['Anime'],
    status: media.status === 'completed' ? 'completed' : 'ongoing',
    rating: media.rating ?? 0,
    episodes: episodes.map((ep): AnimeEpisode => ({
      id: ep.id,
      number: ep.number,
      title: ep.title,
      durationSeconds: ep.durationSeconds ?? 1440,
      streamUrl: '',
      thumbnailUrl: ep.thumbnailUrl ?? media.coverUrl,
    })),
  };
}

type AnimeContentState = {
  anime: AnimeDetails | null;
  loading: boolean;
  error: string | null;
  isProviderContent: boolean;
};

const EMPTY_ANIME_STATE: AnimeContentState = {
  anime: null,
  loading: false,
  error: null,
  isProviderContent: false,
};

const PENDING_ANIME_STATE: AnimeContentState = {
  anime: null,
  loading: true,
  error: null,
  isProviderContent: true,
};

export function useAnimeContent(routeId: string | undefined): AnimeContentState {
  const builtin = useMemo(() => (routeId ? getBuiltinAnimeDetails(routeId) : null), [routeId]);

  // Resolved payloads are tagged with the route they belong to, so "no route",
  // "builtin title" and "still loading" are all derived during render rather
  // than cascading synchronous setState from the effect body.
  const [resolved, setResolved] = useState<{ key: string; state: AnimeContentState } | null>(null);

  useEffect(() => {
    if (!routeId || builtin) return;
    const key = routeId;

    let cancelled = false;
    let fresh = false;
    let local: AnimeDetails | null = null;
    const localReady = loadOfflineCatalog('anime', routeId)
      .then((saved) => {
        local = saved;
        if (saved && !cancelled && !fresh)
          setResolved({
            key,
            state: { anime: saved, loading: false, error: null, isProviderContent: true },
          });
      })
      .catch(() => {});

    Promise.all([getMediaDetails(routeId), getMediaEpisodes(routeId)])
      .then(([media, episodes]) => {
        if (cancelled) return;
        fresh = true;
        useLibraryStore.getState().rememberMedia({
          id: encodeMediaRouteId(media.ref.providerId, media.ref.sourceId),
          title: media.title,
          coverUrl: media.coverUrl,
          bannerUrl: media.bannerUrl ?? media.coverUrl,
          genres: media.genres,
          mediaType: 'anime',
          episodeCount: episodes.length,
        });
        setResolved({
          key,
          state: {
            anime: toAnimeDetails(media, episodes),
            loading: false,
            error: null,
            isProviderContent: true,
          },
        });
      })
      .catch(async (error: unknown) => {
        await localReady;
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to load anime details.';
        setResolved({
          key,
          state: {
            anime: local,
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
    if (!routeId) return EMPTY_ANIME_STATE;
    if (builtin) return { anime: builtin, loading: false, error: null, isProviderContent: false };
    if (resolved?.key === routeId) return resolved.state;
    return PENDING_ANIME_STATE;
  }, [routeId, builtin, resolved]);
}
