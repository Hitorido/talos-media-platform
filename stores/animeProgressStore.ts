import { useHiddenPrivateIds } from '@/hooks/useHiddenPrivateIds';
import { usePrivacyStore } from '@/stores/privacyStore';
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

const seedProgress: Record<string, EpisodeProgress> = {};

export function buildContinueWatching(
  progressByAnime: Record<string, EpisodeProgress>,
  mediaById = useLibraryStore.getState().media,
): ContinueWatchingEntry[] {
  return Object.values(progressByAnime)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((progress) => {
      const anime = getAnimeById(progress.animeId);
      const saved = mediaById[progress.animeId];
      if (!anime && !saved) {
        return null;
      }

      const progressRatio =
        progress.durationSeconds > 0 ? progress.positionSeconds / progress.durationSeconds : 0;

      return {
        animeId: anime?.id ?? saved!.id,
        title: anime?.title ?? saved!.title,
        coverUrl: saved?.customCoverUrl ?? anime?.bannerUrl ?? saved?.bannerUrl ?? saved!.coverUrl,
        bannerUrl: saved?.customCoverUrl ?? anime?.bannerUrl ?? saved?.bannerUrl ?? saved!.coverUrl,
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
        if (usePrivacyStore.getState().incognito) return;
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
  const hidden = useHiddenPrivateIds();
  const media = useLibraryStore((state) => state.media);
  const progressByAnime = useAnimeProgressStore((state) => state.progressByAnime);

  return useMemo(
    () => buildContinueWatching(progressByAnime, media).filter((item) => !hidden.has(item.animeId)),
    [progressByAnime, media, hidden],
  );
}
