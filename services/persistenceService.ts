import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { deleteStoragePath, readJsonFile, saveJsonFile } from '@/services/storageService';

const isWeb = Platform.OS === 'web';
const STORAGE_PREFIX = 'manr-app:';

export const PERSISTENCE_VERSION = 1;

function getAppDataFileUri(key: string): string {
  if (isWeb || !FileSystem.documentDirectory) {
    return `app-data://${key}.json`;
  }
  return `${FileSystem.documentDirectory}app-data/${key}.json`;
}

/**
 * Loads persisted application data (not large media files).
 */
export async function loadPersistedState<T>(key: string): Promise<T | null> {
  if (isWeb && typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  return readJsonFile<T>(getAppDataFileUri(key));
}

/**
 * Saves persisted application data (not large media files).
 */
export async function savePersistedState<T>(key: string, data: T): Promise<void> {
  if (isWeb && typeof localStorage !== 'undefined') {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
    return;
  }

  await saveJsonFile(getAppDataFileUri(key), data);
}

/**
 * Removes persisted application data for a given key.
 */
export async function removePersistedState(key: string): Promise<void> {
  if (isWeb && typeof localStorage !== 'undefined') {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    return;
  }

  await deleteStoragePath(getAppDataFileUri(key));
}
