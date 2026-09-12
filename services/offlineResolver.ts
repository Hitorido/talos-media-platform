import {
  checkFileExists,
  getAnimeStoragePath,
  getMangaChapterStorageDir,
  getNovelChapterStoragePath,
  readJsonFile,
} from '@/services/storageService';
import { useDownloadStore } from '@/stores/downloadStore';
import type { MangaPage } from '@/types/manga';
import type { NovelChapter } from '@/types/novel';

export type ResolvedAnimePlayback = {
  streamUrl: string;
  isOffline: boolean;
};

export type ResolvedMangaPages = {
  pages: MangaPage[];
  isOffline: boolean;
};

export type ResolvedNovelChapter = {
  chapter: NovelChapter;
  isOffline: boolean;
};

/**
 * Resolves anime episode playback source: local downloaded video file or remote stream URL.
 */
export async function resolveAnimeSource(
  animeId: string,
  episodeId: string,
  fallbackStreamUrl: string,
): Promise<ResolvedAnimePlayback> {
  const store = useDownloadStore.getState();
  const download = store.getDownload(animeId, episodeId);

  if (download?.status === 'completed' && download.localPath) {
    const exists = await checkFileExists(download.localPath);
    if (exists) {
      return {
        streamUrl: download.localPath,
        isOffline: true,
      };
    }
  }

  // Check storage path directly as fallback
  const localFile = getAnimeStoragePath(animeId, episodeId);
  const fileExists = await checkFileExists(localFile);
  if (fileExists) {
    return {
      streamUrl: localFile,
      isOffline: true,
    };
  }

  return {
    streamUrl: fallbackStreamUrl,
    isOffline: false,
  };
}

/**
 * Resolves manga chapter pages: local downloaded image files or remote URLs.
 */
export async function resolveMangaPages(
  mangaId: string,
  chapterId: string,
  fallbackPages: MangaPage[],
): Promise<ResolvedMangaPages> {
  const store = useDownloadStore.getState();
  const download = store.getDownload(mangaId, chapterId);

  const manifestPath = `${getMangaChapterStorageDir(mangaId, chapterId)}manifest.json`;
  const targetPath = download?.localPath || manifestPath;

  const manifest = await readJsonFile<{
    pages: { pageNumber: number; localUri: string; remoteUrl: string }[];
  }>(targetPath);

  if (manifest && manifest.pages && manifest.pages.length > 0) {
    const resolvedPages: MangaPage[] = manifest.pages.map((p) => ({
      pageNumber: p.pageNumber,
      imageUrl: p.localUri,
      aspectRatio: 0.67,
      chapterId,
    }));

    return {
      pages: resolvedPages,
      isOffline: true,
    };
  }

  return {
    pages: fallbackPages,
    isOffline: false,
  };
}

/**
 * Resolves novel chapter content: local downloaded chapter text or remote data.
 */
export async function resolveNovelChapter(
  novelId: string,
  chapterId: string,
  fallbackChapter: NovelChapter,
): Promise<ResolvedNovelChapter> {
  const targetPath = getNovelChapterStoragePath(novelId, chapterId);
  const chapterData = await readJsonFile<NovelChapter>(targetPath);

  if (chapterData && chapterData.paragraphs && chapterData.paragraphs.length > 0) {
    return {
      chapter: {
        ...fallbackChapter,
        ...chapterData,
      },
      isOffline: true,
    };
  }

  return {
    chapter: fallbackChapter,
    isOffline: false,
  };
}
