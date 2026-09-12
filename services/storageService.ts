import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';


const isWeb = Platform.OS === 'web';
const memoryStorage = new Map<string, string>();

/**
 * Returns the base downloads directory path.
 */
export function getBaseDownloadsDir(): string {
  if (isWeb || !FileSystem.documentDirectory) {
    return 'memory://downloads/';
  }
  return `${FileSystem.documentDirectory}downloads/`;
}

export function getAnimeStoragePath(animeId: string, episodeId: string): string {
  return `${getBaseDownloadsDir()}anime/${animeId}/${episodeId}/video.mp4`;
}

export function getMangaChapterStorageDir(mangaId: string, chapterId: string): string {
  return `${getBaseDownloadsDir()}manga/${mangaId}/${chapterId}/`;
}

export function getNovelChapterStoragePath(novelId: string, chapterId: string): string {
  return `${getBaseDownloadsDir()}novel/${novelId}/${chapterId}/chapter.json`;
}

export async function ensureDirectory(dirUri: string): Promise<void> {
  if (isWeb || !FileSystem.documentDirectory) {
    return;
  }
  try {
    const dirInfo = await FileSystem.getInfoAsync(dirUri);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
    }
  } catch (error) {
    console.warn(`[storageService] Failed to ensure directory ${dirUri}:`, error);
  }
}

export async function checkFileExists(fileUri: string | null): Promise<boolean> {
  if (!fileUri) return false;
  if (isWeb || !FileSystem.documentDirectory) {
    return memoryStorage.has(fileUri);
  }
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    return info.exists;
  } catch {
    return false;
  }
}

export async function saveJsonFile(fileUri: string, data: unknown): Promise<void> {
  const content = JSON.stringify(data);
  if (isWeb || !FileSystem.documentDirectory) {
    memoryStorage.set(fileUri, content);
    return;
  }
  const dir = fileUri.substring(0, fileUri.lastIndexOf('/') + 1);
  await ensureDirectory(dir);
  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

export async function readJsonFile<T>(fileUri: string): Promise<T | null> {
  if (isWeb || !FileSystem.documentDirectory) {
    const cached = memoryStorage.get(fileUri);
    return cached ? (JSON.parse(cached) as T) : null;
  }
  try {
    const exists = await checkFileExists(fileUri);
    if (!exists) return null;
    const content = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return JSON.parse(content) as T;
  } catch (error) {
    console.warn(`[storageService] Failed to read JSON from ${fileUri}:`, error);
    return null;
  }
}

export async function deleteStoragePath(targetUri: string): Promise<void> {
  if (isWeb || !FileSystem.documentDirectory) {
    memoryStorage.delete(targetUri);
    for (const key of Array.from(memoryStorage.keys())) {
      if (key.startsWith(targetUri)) {
        memoryStorage.delete(key);
      }
    }
    return;
  }
  try {
    const info = await FileSystem.getInfoAsync(targetUri);
    if (info.exists) {
      await FileSystem.deleteAsync(targetUri, { idempotent: true });
    }
  } catch (error) {
    console.warn(`[storageService] Failed to delete storage path ${targetUri}:`, error);
  }
}

export type DownloadProgressCallback = (progress: {
  totalBytesWritten: number;
  totalBytesExpectedToWrite: number;
  progress: number;
}) => void;

/**
 * Downloads a single file with progress tracking and resumable support.
 */
export async function downloadFile(
  remoteUrl: string,
  destinationUri: string,
  onProgress?: DownloadProgressCallback,
): Promise<{ uri: string; size: number }> {
  if (isWeb || !FileSystem.documentDirectory) {
    // For Web environment, simulate progressive download
    memoryStorage.set(destinationUri, remoteUrl);
    if (onProgress) {
      onProgress({
        totalBytesWritten: 1024 * 1024,
        totalBytesExpectedToWrite: 1024 * 1024,
        progress: 1,
      });
    }
    return { uri: remoteUrl, size: 1024 * 1024 };
  }

  const dir = destinationUri.substring(0, destinationUri.lastIndexOf('/') + 1);
  await ensureDirectory(dir);

  const downloadResumable = FileSystem.createDownloadResumable(
    remoteUrl,
    destinationUri,
    {},
    (downloadProgress) => {
      const { totalBytesWritten, totalBytesExpectedToWrite } = downloadProgress;
      const progress =
        totalBytesExpectedToWrite > 0
          ? Math.min(Math.max(totalBytesWritten / totalBytesExpectedToWrite, 0), 1)
          : 0;
      onProgress?.({
        totalBytesWritten,
        totalBytesExpectedToWrite,
        progress,
      });
    },
  );

  const result = await downloadResumable.downloadAsync();
  if (!result || !result.uri) {
    throw new Error('Download failed to return a valid local file URI');
  }

  const fileInfo = await FileSystem.getInfoAsync(result.uri);
  const size = (fileInfo as { size?: number }).size ?? 0;

  return {
    uri: result.uri,
    size,
  };
}
