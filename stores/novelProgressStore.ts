import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getNovelById } from '@/services/mock/novelData';
import { appPersistStorage } from '@/stores/persistStorage';
import type { NovelBookmark, NovelReadingProgress, ReaderSettings } from '@/types/novel';

export type ContinueReadingNovelEntry = {
  novelId: string;
  title: string;
  coverUrl: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  scrollPercentage: number;
  totalChapters: number;
  updatedAt: number;
};

type NovelProgressState = {
  progressByNovel: Record<string, NovelReadingProgress>;
  libraryNovelIds: string[];
  favoriteNovelIds: string[];
  bookmarks: NovelBookmark[];
  settings: ReaderSettings;

  setChapterProgress: (progress: NovelReadingProgress) => void;
  getNovelProgress: (novelId: string) => NovelReadingProgress | undefined;
  getChapterProgress: (novelId: string, chapterId: string) => NovelReadingProgress | undefined;

  toggleLibrary: (novelId: string) => void;
  toggleFavorite: (novelId: string) => void;
  isInLibrary: (novelId: string) => boolean;
  isFavorite: (novelId: string) => boolean;

  addBookmark: (bookmark: Omit<NovelBookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (bookmarkId: string) => void;
  isBookmarked: (novelId: string, chapterId: string, paragraphIndex: number) => boolean;

  updateSettings: (newSettings: Partial<ReaderSettings>) => void;
  removeNovelProgress: (novelId: string) => void;
};


const defaultSettings: ReaderSettings = {
  fontSize: 16,
  fontFamily: 'serif',
  lineSpacing: 'normal',
  theme: 'dark',
  margin: 'medium',
  scrollMode: 'continuous',
};

const seedProgress: Record<string, NovelReadingProgress> = {
  'novel-t-1': {
    novelId: 'novel-t-1',
    chapterId: 'novel-t-1-ch-2',
    chapterNumber: 2,
    chapterTitle: 'Chapter 2: The Abyssal Breach',
    scrollPercentage: 0.45,
    paragraphIndex: 3,
    updatedAt: Date.now(),
  },
};

export function buildContinueReadingNovels(
  progressByNovel: Record<string, NovelReadingProgress>,
): ContinueReadingNovelEntry[] {
  return Object.values(progressByNovel)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((progress) => {
      const novel = getNovelById(progress.novelId);
      if (!novel) return null;

      return {
        novelId: novel.id,
        title: novel.title,
        coverUrl: novel.coverUrl,
        chapterId: progress.chapterId,
        chapterNumber: progress.chapterNumber,
        chapterTitle:
          novel.chapters.find((ch) => ch.id === progress.chapterId)?.title ?? progress.chapterTitle,
        scrollPercentage: Math.min(Math.max(progress.scrollPercentage, 0), 1),
        totalChapters: novel.chapters.length,
        updatedAt: progress.updatedAt,
      };
    })
    .filter((entry): entry is ContinueReadingNovelEntry => entry !== null);
}

export const useNovelProgressStore = create<NovelProgressState>()(
  persist(
    (set, get) => ({
  progressByNovel: seedProgress,
  libraryNovelIds: ['novel-t-1'],
  favoriteNovelIds: ['novel-t-1'],
  bookmarks: [],
  settings: defaultSettings,

  setChapterProgress: (progress) => {
    set((state) => ({
      progressByNovel: {
        ...state.progressByNovel,
        [progress.novelId]: progress,
      },
    }));
  },

  getNovelProgress: (novelId) => get().progressByNovel[novelId],

  getChapterProgress: (novelId, chapterId) => {
    const latest = get().progressByNovel[novelId];
    if (!latest || latest.chapterId !== chapterId) {
      return undefined;
    }
    return latest;
  },

  toggleLibrary: (novelId) => {
    set((state) => {
      const exists = state.libraryNovelIds.includes(novelId);
      return {
        libraryNovelIds: exists
          ? state.libraryNovelIds.filter((id) => id !== novelId)
          : [...state.libraryNovelIds, novelId],
      };
    });
  },

  toggleFavorite: (novelId) => {
    set((state) => {
      const exists = state.favoriteNovelIds.includes(novelId);
      return {
        favoriteNovelIds: exists
          ? state.favoriteNovelIds.filter((id) => id !== novelId)
          : [...state.favoriteNovelIds, novelId],
      };
    });
  },

  isInLibrary: (novelId) => get().libraryNovelIds.includes(novelId),
  isFavorite: (novelId) => get().favoriteNovelIds.includes(novelId),

  addBookmark: (bookmark) => {
    const newBookmark: NovelBookmark = {
      ...bookmark,
      id: `bm-${Date.now()}`,
      createdAt: Date.now(),
    };
    set((state) => ({
      bookmarks: [newBookmark, ...state.bookmarks],
    }));
  },

  removeBookmark: (bookmarkId) => {
    set((state) => ({
      bookmarks: state.bookmarks.filter((bm) => bm.id !== bookmarkId),
    }));
  },

  isBookmarked: (novelId, chapterId, paragraphIndex) => {
    return get().bookmarks.some(
      (bm) =>
        bm.novelId === novelId &&
        bm.chapterId === chapterId &&
        bm.paragraphIndex === paragraphIndex,
    );
  },

  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },

  removeNovelProgress: (novelId) => {
    set((state) => {
      const next = { ...state.progressByNovel };
      delete next[novelId];
      return { progressByNovel: next };
    });
  },
    }),
    {
      name: 'novel-progress',
      storage: createJSONStorage(() => appPersistStorage),
      partialize: (state) => ({
        progressByNovel: state.progressByNovel,
        libraryNovelIds: state.libraryNovelIds,
        favoriteNovelIds: state.favoriteNovelIds,
        bookmarks: state.bookmarks,
        settings: state.settings,
      }),
    },
  ),
);


export function useContinueReadingNovels(): ContinueReadingNovelEntry[] {
  const progressByNovel = useNovelProgressStore((state) => state.progressByNovel);
  return useMemo(() => buildContinueReadingNovels(progressByNovel), [progressByNovel]);
}
