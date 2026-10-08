import { useHiddenPrivateIds } from '@/hooks/useHiddenPrivateIds';
import { usePrivacyStore } from '@/stores/privacyStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getMangaById } from '@/services/mock/mangaData';
import { appPersistStorage } from '@/stores/persistStorage';
import type { ChapterReadingProgress, ContinueReadingEntry } from '@/types/manga';

type MangaProgressState = {
  progressByManga: Record<string, ChapterReadingProgress>;
  readingModes: Record<string, 'vertical' | 'horizontal'>;
  setReadingMode: (id: string, mode: 'vertical' | 'horizontal') => void;
  libraryMangaIds: string[];
  favoriteMangaIds: string[];
  setChapterProgress: (progress: ChapterReadingProgress) => void;
  getMangaProgress: (mangaId: string) => ChapterReadingProgress | undefined;
  getChapterProgress: (mangaId: string, chapterId: string) => ChapterReadingProgress | undefined;
  toggleLibrary: (mangaId: string) => void;
  toggleFavorite: (mangaId: string) => void;
  isInLibrary: (mangaId: string) => boolean;
  isFavorite: (mangaId: string) => boolean;
  removeMangaProgress: (mangaId: string) => void;
};

const seedProgress: Record<string, ChapterReadingProgress> = {};

export function buildContinueReading(
  progressByManga: Record<string, ChapterReadingProgress>,
  mediaById = useLibraryStore.getState().media,
): ContinueReadingEntry[] {
  return Object.values(progressByManga)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((progress) => {
      const manga = getMangaById(progress.mangaId);
      const saved = mediaById[progress.mangaId];
      if (!manga && !saved) {
        return null;
      }

      const progressRatio = progress.totalPages > 0 ? progress.pageNumber / progress.totalPages : 0;

      return {
        mangaId: manga?.id ?? saved!.id,
        title: manga?.title ?? saved!.title,
        coverUrl: saved?.customCoverUrl ?? manga?.coverUrl ?? saved!.coverUrl,
        chapterId: progress.chapterId,
        chapterNumber: progress.chapterNumber,
        chapterTitle:
          manga?.chapters.find((ch) => ch.id === progress.chapterId)?.title ??
          progress.chapterTitle,
        pageNumber: progress.pageNumber,
        totalPages: progress.totalPages,
        progress: Math.min(Math.max(progressRatio, 0), 1),
        updatedAt: progress.updatedAt,
      } satisfies ContinueReadingEntry;
    })
    .filter((entry): entry is ContinueReadingEntry => entry !== null);
}

export const useMangaProgressStore = create<MangaProgressState>()(
  persist(
    (set, get) => ({
      progressByManga: seedProgress,
      readingModes: {},
      setReadingMode: (id, mode) =>
        set((state) => ({ readingModes: { ...state.readingModes, [id]: mode } })),
      libraryMangaIds: [],
      favoriteMangaIds: [],

      setChapterProgress: (progress) => {
        if (usePrivacyStore.getState().incognito) return;
        set((state) => ({
          progressByManga: {
            ...state.progressByManga,
            [progress.mangaId]: progress,
          },
        }));
      },

      getMangaProgress: (mangaId) => get().progressByManga[mangaId],

      getChapterProgress: (mangaId, chapterId) => {
        const latest = get().progressByManga[mangaId];
        if (!latest || latest.chapterId !== chapterId) {
          return undefined;
        }
        return latest;
      },

      toggleLibrary: (mangaId) => {
        set((state) => {
          const exists = state.libraryMangaIds.includes(mangaId);
          return {
            libraryMangaIds: exists
              ? state.libraryMangaIds.filter((id) => id !== mangaId)
              : [...state.libraryMangaIds, mangaId],
          };
        });
      },

      toggleFavorite: (mangaId) => {
        set((state) => {
          const exists = state.favoriteMangaIds.includes(mangaId);
          return {
            favoriteMangaIds: exists
              ? state.favoriteMangaIds.filter((id) => id !== mangaId)
              : [...state.favoriteMangaIds, mangaId],
          };
        });
      },

      isInLibrary: (mangaId) => get().libraryMangaIds.includes(mangaId),
      isFavorite: (mangaId) => get().favoriteMangaIds.includes(mangaId),

      removeMangaProgress: (mangaId) => {
        set((state) => {
          const next = { ...state.progressByManga };
          delete next[mangaId];
          return { progressByManga: next };
        });
      },
    }),
    {
      name: 'manga-progress',
      storage: createJSONStorage(() => appPersistStorage),
      partialize: (state) => ({
        progressByManga: state.progressByManga,
        readingModes: state.readingModes,
        libraryMangaIds: state.libraryMangaIds,
        favoriteMangaIds: state.favoriteMangaIds,
      }),
    },
  ),
);

export function useContinueReading(): ContinueReadingEntry[] {
  const hidden = useHiddenPrivateIds();
  const media = useLibraryStore((state) => state.media);
  const progressByManga = useMangaProgressStore((state) => state.progressByManga);
  return useMemo(
    () => buildContinueReading(progressByManga, media).filter((item) => !hidden.has(item.mangaId)),
    [progressByManga, media, hidden],
  );
}
