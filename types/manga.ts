export type ReadingMode = 'vertical' | 'horizontal';
export type ReadingDirection = 'ltr' | 'rtl';

export type MangaPage = {
  pageNumber: number;
  imageUrl: string;
  aspectRatio?: number;
  chapterId?: string;
  chapterNumber?: number;
};

export type MangaChapter = {
  id: string;
  number: number;
  title: string;
  releaseDate: string;
  pageCount: number;
  pages: MangaPage[];
  language?: string;
  scanlationGroup?: string;
};

export type MangaDetails = {
  id: string;
  title: string;
  altTitles?: string[];
  description: string;
  coverUrl: string;
  bannerUrl: string;
  author: string;
  artist: string;
  genres: string[];
  rating: number;
  status: 'ongoing' | 'completed';
  chapters: MangaChapter[];
};

export type ChapterReadingProgress = {
  mangaId: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  pageNumber: number;
  totalPages: number;
  updatedAt: number;
};

export type ContinueReadingEntry = {
  mangaId: string;
  title: string;
  coverUrl: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  pageNumber: number;
  totalPages: number;
  progress: number;
  updatedAt: number;
};

