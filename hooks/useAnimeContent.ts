import { useLibraryStore } from '@/stores/libraryStore';
import { useEffect, useState } from 'react';

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

export function useAnimeContent(routeId: string | undefined): AnimeContentState {
  const [state, setState] = useState<AnimeContentState>({
    anime: routeId ? (getBuiltinAnimeDetails(routeId) ?? null) : null,
    loading: Boolean(routeId && !getBuiltinAnimeDetails(routeId)),
    error: null,
    isProviderContent: Boolean(routeId && !getBuiltinAnimeDetails(routeId)),
  });

  useEffect(() => {
    if (!routeId) {
      setState({ anime: null, loading: false, error: null, isProviderContent: false });
      return;
    }

    const builtin = getBuiltinAnimeDetails(routeId);
    if (builtin) {
      setState({
        anime: builtin,
        loading: false,
        error: null,
        isProviderContent: false,
      });
      return;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null, isProviderContent: true }));

    Promise.all([getMediaDetails(routeId), getMediaEpisodes(routeId)])
      .then(([media, episodes]) => {
        if (cancelled) return;
        useLibraryStore.getState().rememberMedia({
          id: encodeMediaRouteId(media.ref.providerId, media.ref.sourceId), title:media.title, coverUrl:media.coverUrl,
          bannerUrl:media.bannerUrl ?? media.coverUrl, genres:media.genres,
          mediaType:'anime',
          episodeCount:episodes.length,
        });
        setState({
          anime: toAnimeDetails(media, episodes),
          loading: false,
          error: null,
          isProviderContent: true,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to load anime details.';
        setState({
          anime: null,
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
