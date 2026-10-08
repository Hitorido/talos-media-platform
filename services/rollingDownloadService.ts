import { usePrivacyStore } from '@/stores/privacyStore';
import {
  deleteDownload,
  downloadMangaChapter,
  downloadNovelChapter,
} from '@/services/downloadService';
import { useDownloadStore } from '@/stores/downloadStore';
import { useRollingDownloadSettingsStore } from '@/stores/rollingDownloadSettingsStore';
import type { MangaDetails } from '@/types/manga';
import type { NovelDetails } from '@/types/novel';

const syncTokens = new Map<string, number>();

async function removeReadItems(
  mediaId: string,
  chapterIndexes: Map<string, number>,
  activeIndex: number,
  windowSize: number,
) {
  const windowEnd = activeIndex + windowSize;
  const oldItems = Object.values(useDownloadStore.getState().items).filter((item) => {
    if (item.mediaId !== mediaId) return false;
    const index = chapterIndexes.get(item.unitId);
    return index !== undefined && (index < activeIndex || index >= windowEnd);
  });
  await Promise.all(oldItems.map((item) => deleteDownload(item.id)));
}

export async function maintainMangaDownloadWindow(
  manga: MangaDetails,
  activeChapterId: string,
): Promise<void> {
  if (usePrivacyStore.getState().incognito) return;
  const settings = useRollingDownloadSettingsStore.getState();
  if (!settings.enabled) return;
  const activeIndex = manga.chapters.findIndex((chapter) => chapter.id === activeChapterId);
  if (activeIndex < 0) return;

  const token = (syncTokens.get(manga.id) ?? 0) + 1;
  syncTokens.set(manga.id, token);
  const chapterIndexes = new Map(manga.chapters.map((chapter, index) => [chapter.id, index]));
  await removeReadItems(manga.id, chapterIndexes, activeIndex, settings.windowSize);
  const latestSettings = useRollingDownloadSettingsStore.getState();
  if (syncTokens.get(manga.id) !== token || !latestSettings.enabled) return;

  for (const chapter of manga.chapters.slice(
    activeIndex,
    activeIndex + latestSettings.windowSize,
  )) {
    downloadMangaChapter(manga, chapter);
  }
}

export async function maintainNovelDownloadWindow(
  novel: NovelDetails,
  activeChapterId: string,
): Promise<void> {
  if (usePrivacyStore.getState().incognito) return;
  const settings = useRollingDownloadSettingsStore.getState();
  if (!settings.enabled) return;
  const activeIndex = novel.chapters.findIndex((chapter) => chapter.id === activeChapterId);
  if (activeIndex < 0) return;

  const token = (syncTokens.get(novel.id) ?? 0) + 1;
  syncTokens.set(novel.id, token);
  const chapterIndexes = new Map(novel.chapters.map((chapter, index) => [chapter.id, index]));
  await removeReadItems(novel.id, chapterIndexes, activeIndex, settings.windowSize);
  const latestSettings = useRollingDownloadSettingsStore.getState();
  if (syncTokens.get(novel.id) !== token || !latestSettings.enabled) return;

  for (const chapter of novel.chapters.slice(
    activeIndex,
    activeIndex + latestSettings.windowSize,
  )) {
    downloadNovelChapter(novel, chapter);
  }
}
