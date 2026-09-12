import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getMangaById } from '@/services/mock/mangaData';
import { appPersistStorage } from '@/stores/persistStorage';
import type { ChapterReadingProgress, ContinueReadingEntry } from '@/types/manga';

type MangaProgressState = {
  progressByManga: Record<string, ChapterReadingProgress>;
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


const seedProgress: Record<string, ChapterReadingProgress> = {
  'manga-cw-1': {
    mangaId: 'manga-cw-1',
    chapterId: 'manga-cw-1-ch-4',
    chapterNumber: 4,
    chapterTitle: 'Chapter 4',
    pageNumber: 5,
    totalPages: 8,
    updatedAt: Date.now(),
  },
  'manga-cw-2': {
    mangaId: 'manga-cw-2',
    chapterId: 'manga-cw-2-ch-12',
    chapterNumber: 12,
    chapterTitle: 'Chapter 12',
    pageNumber: 8,
    totalPages: 10,
    updatedAt: Date.now() - 3600000,
  },
  'manga-cw-3': {
    mangaId: 'manga-cw-3',
    chapterId: 'manga-cw-3-ch-1',
    chapterNumber: 1,
    chapterTitle: 'Chapter 1',
    pageNumber: 3,
    totalPages: 6,
    updatedAt: Date.now() - 7200000,
  },
};

export function buildContinueReading(
  progressByManga: Record<string, ChapterReadingProgress>,
): ContinueReadingEntry[] {
  return Object.values(progressByManga)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((progress) => {
      const manga = getMangaById(progress.mangaId);
      if (!manga) {
        return null;
      }

      const progressRatio = progress.totalPages > 0 ? progress.pageNumber / progress.totalPages : 0;

      return {
        mangaId: manga.id,
        title: manga.title,
        coverUrl: manga.coverUrl,
        chapterId: progress.chapterId,
        chapterNumber: progress.chapterNumber,
        chapterTitle:
          manga.chapters.find((ch) => ch.id === progress.chapterId)?.title ?? progress.chapterTitle,
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
  libraryMangaIds: ['manga-cw-1', 'manga-cw-2'],
  favoriteMangaIds: ['manga-cw-1'],

  setChapterProgress: (progress) => {
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
        libraryMangaIds: state.libraryMangaIds,
        favoriteMangaIds: state.favoriteMangaIds,
      }),
    },
  ),
);


export function useContinueReading(): ContinueReadingEntry[] {
  const progressByManga = useMangaProgressStore((state) => state.progressByManga);
  return useMemo(() => buildContinueReading(progressByManga), [progressByManga]);
}
