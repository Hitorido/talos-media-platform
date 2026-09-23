import { useLibraryStore } from '@/stores/libraryStore';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getAnimeById } from '@/services/mock/animeData';
import { appPersistStorage } from '@/stores/persistStorage';
import type { ContinueWatchingEntry, EpisodeProgress } from '@/types/anime';

type AnimeProgressState = {
  progressByAnime: Record<string, EpisodeProgress>;
  setEpisodeProgress: (progress: EpisodeProgress) => void;
  getEpisodeProgress: (animeId: string, episodeId: string) => EpisodeProgress | undefined;
  getLatestProgress: (animeId: string) => EpisodeProgress | undefined;
  removeEpisodeProgress: (animeId: string) => void;
};


const seedProgress: Record<string, EpisodeProgress> = {
  'anime-cw-1': {
    animeId: 'anime-cw-1',
    episodeId: 'anime-cw-1-ep-8',
    episodeNumber: 8,
    episodeTitle: 'The Gate Beyond the Aurora',
    positionSeconds: 370,
    durationSeconds: 596,
    updatedAt: Date.now(),
  },
  'anime-cw-2': {
    animeId: 'anime-cw-2',
    episodeId: 'anime-cw-2-ep-3',
    episodeNumber: 3,
    episodeTitle: 'Northern Wind Episode 3',
    positionSeconds: 208,
    durationSeconds: 596,
    updatedAt: Date.now(),
  },
  'anime-cw-3': {
    animeId: 'anime-cw-3',
    episodeId: 'anime-cw-3-ep-15',
    episodeNumber: 15,
    episodeTitle: 'Echoes Episode 15',
    positionSeconds: 465,
    durationSeconds: 596,
    updatedAt: Date.now(),
  },
};

export function buildContinueWatching(
  progressByAnime: Record<string, EpisodeProgress>,
): ContinueWatchingEntry[] {
  return Object.values(progressByAnime)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((progress) => {
      const anime = getAnimeById(progress.animeId);
      const saved = useLibraryStore.getState().media[progress.animeId];
      if (!anime && !saved) {
        return null;
      }

      const progressRatio =
        progress.durationSeconds > 0 ? progress.positionSeconds / progress.durationSeconds : 0;

      return {
        animeId: anime?.id ?? saved!.id,
        title: anime?.title ?? saved!.title,
        coverUrl: anime?.bannerUrl ?? saved!.bannerUrl ?? saved!.coverUrl,
        bannerUrl: anime?.bannerUrl ?? saved!.bannerUrl ?? saved!.coverUrl,
        episodeId: progress.episodeId,
        episodeNumber: progress.episodeNumber,
        episodeTitle:
          anime?.episodes.find((episode) => episode.id === progress.episodeId)?.title ??
          progress.episodeTitle,
        totalEpisodes: anime?.episodes.length ?? saved?.episodeCount ?? 0,
        progress: Math.min(Math.max(progressRatio, 0), 1),
      } satisfies ContinueWatchingEntry;
    })
    .filter((entry): entry is ContinueWatchingEntry => entry !== null);
}

export const useAnimeProgressStore = create<AnimeProgressState>()(
  persist(
    (set, get) => ({
  progressByAnime: seedProgress,

  setEpisodeProgress: (progress) => {
    set((state) => ({
      progressByAnime: {
        ...state.progressByAnime,
        [progress.animeId]: progress,
      },
    }));
  },

  getEpisodeProgress: (animeId, episodeId) => {
    const latest = get().progressByAnime[animeId];
    if (!latest || latest.episodeId !== episodeId) {
      return undefined;
    }
    return latest;
  },

  getLatestProgress: (animeId) => get().progressByAnime[animeId],

  removeEpisodeProgress: (animeId) => {
    set((state) => {
      const next = { ...state.progressByAnime };
      delete next[animeId];
      return { progressByAnime: next };
    });
  },
    }),
    {
      name: 'anime-progress',
      storage: createJSONStorage(() => appPersistStorage),
      partialize: (state) => ({
        progressByAnime: state.progressByAnime,
      }),
    },
  ),
);


export function useContinueWatching(): ContinueWatchingEntry[] {
  const media = useLibraryStore(state => state.media);
  const progressByAnime = useAnimeProgressStore((state) => state.progressByAnime);

  return useMemo(() => buildContinueWatching(progressByAnime), [progressByAnime, media]);
}
