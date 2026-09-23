export type NovelTheme = 'dark' | 'light' | 'sepia' | 'midnight';
export type NovelFontFamily = 'serif' | 'sans' | 'mono';
export type NovelMargin = 'narrow' | 'medium' | 'wide';
export type NovelLineSpacing = 'compact' | 'normal' | 'relaxed';

export type NovelChapter = {
  id: string;
  number: number;
  title: string;
  releaseDate: string;
  wordCount: number;
  paragraphs: string[];
};

export type NovelDetails = {
  language?: string;
  id: string;
  title: string;
  altTitles?: string[];
  description: string;
  coverUrl: string;
  bannerUrl: string;
  author: string;
  translator?: string;
  genres: string[];
  rating: number;
  status: 'ongoing' | 'completed';
  chapters: NovelChapter[];
};

export type NovelReadingProgress = {
  novelId: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  scrollPercentage: number;
  paragraphIndex: number;
  updatedAt: number;
};

export type NovelBookmark = {
  id: string;
  novelId: string;
  chapterId: string;
  chapterTitle: string;
  paragraphIndex: number;
  snippet: string;
  createdAt: number;
};

export type ReaderSettings = {
  fontSize: number; // e.g. 14 to 28
  fontFamily: NovelFontFamily;
  lineSpacing: NovelLineSpacing;
  theme: NovelTheme;
  margin: NovelMargin;
  scrollMode: 'continuous' | 'normal';
};
