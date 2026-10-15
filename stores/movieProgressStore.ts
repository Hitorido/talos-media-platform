import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { appPersistStorage } from './persistStorage';
import { usePrivacyStore } from './privacyStore';
type Progress = { positionSeconds: number; durationSeconds: number; updatedAt: number };
/** Movie/TV progress uses type + TMDB ID + episode identity, never an anime route ID. */
export const useMovieProgressStore = create<{
  entries: Record<string, Progress>;
  save: (key: string, progress: Progress) => void;
}>()(
  persist(
    (set) => ({
      entries: {},
      save: (key, progress) => {
        if (!usePrivacyStore.getState().incognito)
          set((s) => ({ entries: { ...s.entries, [key]: progress } }));
      },
    }),
    { name: 'movie-tv-progress', storage: createJSONStorage(() => appPersistStorage) },
  ),
);
