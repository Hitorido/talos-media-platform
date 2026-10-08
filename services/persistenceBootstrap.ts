import { usePrivacyStore } from '@/stores/privacyStore';
import { initializeProviders } from '@/providers';
import { processDownloadQueue } from '@/services/downloadService';
import { checkFileExists } from '@/services/storageService';
import { useAnimeProgressStore } from '@/stores/animeProgressStore';
import { useAuthStore } from '@/stores/authStore';
import { useDownloadStore } from '@/stores/downloadStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useMangaProgressStore } from '@/stores/mangaProgressStore';
import { useNovelProgressStore } from '@/stores/novelProgressStore';
import { useProviderStore } from '@/stores/providerStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useSubtitlePreferencesStore } from '@/stores/subtitlePreferencesStore';
import type { DownloadItem } from '@/types/download';

/**
 * Rehydrates all persisted stores from disk/localStorage.
 */
export async function bootstrapPersistence(): Promise<void> {
  initializeProviders();

  await Promise.all([
    useAuthStore
      .getState()
      .hydrate()
      .catch(() => {
        // Secure storage failure must not prevent offline media restoration.
        // console.warn('[auth] Secure session could not be restored. Please sign in again.');
      }),
    useLibraryStore.persist.rehydrate(),
    usePrivacyStore.persist.rehydrate(),
    useAnimeProgressStore.persist.rehydrate(),
    useMangaProgressStore.persist.rehydrate(),
    useNovelProgressStore.persist.rehydrate(),
    useDownloadStore.persist.rehydrate(),
    useSettingsStore.persist.rehydrate(),
    useProviderStore.persist.rehydrate(),
    useSubtitlePreferencesStore.persist.rehydrate(),
  ]);

  await reconcileDownloadStore();
  processDownloadQueue();
}

/**
 * Verifies downloaded files still exist and normalizes in-flight download states.
 */
export async function reconcileDownloadStore(): Promise<void> {
  const store = useDownloadStore.getState();
  const items = { ...store.items };
  let changed = false;

  for (const [id, item] of Object.entries(items)) {
    if (item.status === 'downloading') {
      items[id] = {
        ...item,
        status: 'queued',
        updatedAt: Date.now(),
      };
      changed = true;
      continue;
    }

    if (item.status !== 'completed' || !item.localPath) {
      continue;
    }

    const exists = await checkFileExists(item.localPath);
    if (!exists) {
      items[id] = markDownloadMissing(item);
      changed = true;
    }
  }

  if (changed) {
    useDownloadStore.setState({ items });
  }
}

function markDownloadMissing(item: DownloadItem): DownloadItem {
  return {
    ...item,
    status: 'failed',
    error: 'Local file missing',
    localPath: null,
    updatedAt: Date.now(),
  };
}
