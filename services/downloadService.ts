import {
  deleteStoragePath,
  downloadFile,
  getAnimeStoragePath,
  getMangaChapterStorageDir,
  getNovelChapterStoragePath,
  saveJsonFile,
} from '@/services/storageService';
import { useDownloadStore } from '@/stores/downloadStore';
import type { AnimeDetails, AnimeEpisode } from '@/types/anime';
import type { DownloadItem } from '@/types/download';
import type { MangaChapter, MangaDetails } from '@/types/manga';
import type { NovelChapter, NovelDetails } from '@/types/novel';

const MAX_CONCURRENT_DOWNLOADS = 2;
const activeDownloads = new Set<string>();
const abortControllers = new Map<string, { isAborted: boolean }>();

let isProcessingQueue = false;

/**
 * Main queue runner that picks queued items up to MAX_CONCURRENT_DOWNLOADS.
 */
export async function processDownloadQueue(): Promise<void> {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    const store = useDownloadStore.getState();
    const items = Object.values(store.items);
    const queuedItems = items.filter((item) => item.status === 'queued');

    for (const item of queuedItems) {
      if (activeDownloads.size >= MAX_CONCURRENT_DOWNLOADS) {
        break;
      }
      if (!activeDownloads.has(item.id)) {
        activeDownloads.add(item.id);
        // Start download in background
        runDownloadTask(item).finally(() => {
          activeDownloads.delete(item.id);
          abortControllers.delete(item.id);
          // Trigger next in queue
          processDownloadQueue();
        });
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

async function runDownloadTask(item: DownloadItem): Promise<void> {
  const store = useDownloadStore.getState();
  const signal = { isAborted: false };
  abortControllers.set(item.id, signal);

  store.setStatus(item.id, 'downloading', { error: null });

  try {
    if (item.mediaType === 'anime') {
      await processAnimeDownload(item, signal);
    } else if (
      item.mediaType === 'manga' ||
      item.mediaType === 'manhwa' ||
      item.mediaType === 'manhua'
    ) {
      await processMangaDownload(item, signal);
    } else if (item.mediaType === 'novel') {
      await processNovelDownload(item, signal);
    }
  } catch (error: unknown) {
    if (signal.isAborted) {
      // Aborted gracefully (e.g. paused or cancelled)
      return;
    }
    const message = error instanceof Error ? error.message : 'Unknown download error occurred';
    useDownloadStore.getState().setStatus(item.id, 'failed', {
      error: message,
    });
  }
}

async function processAnimeDownload(
  item: DownloadItem,
  signal: { isAborted: boolean },
): Promise<void> {
  const store = useDownloadStore.getState();
  const videoUrl = item.payload.videoUrl;
  if (!videoUrl) {
    throw new Error('No stream URL provided for anime episode');
  }

  const destinationUri = getAnimeStoragePath(item.mediaId, item.unitId);

  const result = await downloadFile(videoUrl, destinationUri, (progress) => {
    if (signal.isAborted) return;
    store.updateProgress(item.id, {
      progress: progress.progress,
      bytesDownloaded: progress.totalBytesWritten,
      totalBytes: progress.totalBytesExpectedToWrite || progress.totalBytesWritten,
    });
  });

  if (signal.isAborted) return;

  store.setStatus(item.id, 'completed', {
    localPath: result.uri,
    progress: 1,
    bytesDownloaded: result.size,
    totalBytes: result.size,
  });
}

async function processMangaDownload(
  item: DownloadItem,
  signal: { isAborted: boolean },
): Promise<void> {
  const store = useDownloadStore.getState();
  const pageUrls = item.payload.pageUrls ?? [];
  if (pageUrls.length === 0) {
    throw new Error('No page URLs available for this manga chapter');
  }

  const baseDir = getMangaChapterStorageDir(item.mediaId, item.unitId);
  const downloadedPages: { pageNumber: number; localUri: string; remoteUrl: string }[] = [];
  let totalBytes = 0;

  for (let i = 0; i < pageUrls.length; i++) {
    if (signal.isAborted) return;

    const pageUrl = pageUrls[i];
    const pageNum = i + 1;
    const pageFileUri = `${baseDir}page-${String(pageNum).padStart(3, '0')}.jpg`;

    const result = await downloadFile(pageUrl, pageFileUri);
    totalBytes += result.size;
    downloadedPages.push({
      pageNumber: pageNum,
      localUri: result.uri,
      remoteUrl: pageUrl,
    });

    const progress = (i + 1) / pageUrls.length;
    store.updateProgress(item.id, {
      progress,
      bytesDownloaded: totalBytes,
      totalBytes: Math.round(totalBytes / progress),
    });
  }

  if (signal.isAborted) return;

  const manifestPath = `${baseDir}manifest.json`;
  await saveJsonFile(manifestPath, {
    mediaId: item.mediaId,
    chapterId: item.unitId,
    unitTitle: item.unitTitle,
    unitNumber: item.unitNumber,
    pages: downloadedPages,
    downloadedAt: Date.now(),
  });

  store.setStatus(item.id, 'completed', {
    localPath: manifestPath,
    progress: 1,
    bytesDownloaded: totalBytes,
    totalBytes,
  });
}

async function processNovelDownload(
  item: DownloadItem,
  signal: { isAborted: boolean },
): Promise<void> {
  const store = useDownloadStore.getState();
  const paragraphs = item.payload.paragraphs ?? [];
  if (paragraphs.length === 0) {
    throw new Error('No text content found for this novel chapter');
  }

  const destinationUri = getNovelChapterStoragePath(item.mediaId, item.unitId);
  const chapterData = {
    novelId: item.mediaId,
    chapterId: item.unitId,
    title: item.unitTitle,
    number: item.unitNumber,
    paragraphs,
    wordCount: item.payload.wordCount ?? 2500,
    downloadedAt: Date.now(),
  };

  await saveJsonFile(destinationUri, chapterData);

  if (signal.isAborted) return;

  const estimatedBytes = JSON.stringify(chapterData).length;

  store.updateProgress(item.id, {
    progress: 1,
    bytesDownloaded: estimatedBytes,
    totalBytes: estimatedBytes,
  });

  store.setStatus(item.id, 'completed', {
    localPath: destinationUri,
    progress: 1,
    bytesDownloaded: estimatedBytes,
    totalBytes: estimatedBytes,
  });
}

// ----------------------------------------------------
// Public APIs for UI interactions
// ----------------------------------------------------

export function downloadAnimeEpisode(anime: AnimeDetails, episode: AnimeEpisode): string {
  const id = useDownloadStore.getState().enqueueDownload({
    mediaId: anime.id,
    mediaType: 'anime',
    mediaTitle: anime.title,
    coverUrl: anime.coverUrl,
    unitId: episode.id,
    unitNumber: episode.number,
    unitTitle: `Episode ${episode.number}: ${episode.title}`,
    payload: {
      videoUrl: episode.streamUrl,
    },
  });

  processDownloadQueue();
  return id;
}

export function downloadMangaChapter(manga: MangaDetails, chapter: MangaChapter): string {
  const mangaType = manga.genres.includes('Manhwa')
    ? 'manhwa'
    : manga.genres.includes('Manhua')
      ? 'manhua'
      : 'manga';

  const id = useDownloadStore.getState().enqueueDownload({
    mediaId: manga.id,
    mediaType: mangaType,
    mediaTitle: manga.title,
    coverUrl: manga.coverUrl,
    unitId: chapter.id,
    unitNumber: chapter.number,
    unitTitle: `Chapter ${chapter.number}: ${chapter.title}`,
    payload: {
      pageUrls: chapter.pages.map((p) => p.imageUrl),
    },
  });

  processDownloadQueue();
  return id;
}

export function downloadNovelChapter(novel: NovelDetails, chapter: NovelChapter): string {
  const id = useDownloadStore.getState().enqueueDownload({
    mediaId: novel.id,
    mediaType: 'novel',
    mediaTitle: novel.title,
    coverUrl: novel.coverUrl,
    unitId: chapter.id,
    unitNumber: chapter.number,
    unitTitle: chapter.title,
    payload: {
      paragraphs: chapter.paragraphs,
      wordCount: chapter.wordCount,
    },
  });

  processDownloadQueue();
  return id;
}

export function pauseDownload(id: string): void {
  const controller = abortControllers.get(id);
  if (controller) controller.isAborted = true;
  activeDownloads.delete(id);
  useDownloadStore.getState().pauseDownload(id);
  processDownloadQueue();
}

export function resumeDownload(id: string): void {
  useDownloadStore.getState().resumeDownload(id);
  processDownloadQueue();
}

export function retryDownload(id: string): void {
  useDownloadStore.getState().retryDownload(id);
  processDownloadQueue();
}

export function cancelDownload(id: string): void {
  const controller = abortControllers.get(id);
  if (controller) controller.isAborted = true;
  activeDownloads.delete(id);
  useDownloadStore.getState().cancelDownload(id);
  processDownloadQueue();
}

export async function deleteDownload(id: string): Promise<void> {
  const item = useDownloadStore.getState().items[id];
  if (item) {
    cancelDownload(id);
    if (item.mediaType === 'anime') {
      await deleteStoragePath(getAnimeStoragePath(item.mediaId, item.unitId));
    } else if (
      item.mediaType === 'manga' ||
      item.mediaType === 'manhwa' ||
      item.mediaType === 'manhua'
    ) {
      await deleteStoragePath(getMangaChapterStorageDir(item.mediaId, item.unitId));
    } else if (item.mediaType === 'novel') {
      await deleteStoragePath(getNovelChapterStoragePath(item.mediaId, item.unitId));
    }
  }
  useDownloadStore.getState().deleteDownload(id);
}

export function clearCompletedDownloads(): void {
  useDownloadStore.getState().clearCompleted();
}
