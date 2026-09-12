import type { StateStorage } from 'zustand/middleware';

import {
  loadPersistedState,
  removePersistedState,
  savePersistedState,
} from '@/services/persistenceService';

/**
 * Zustand persist adapter backed by app-data JSON files (native)
 * or localStorage (web). Large media files are stored separately.
 */
export const appPersistStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const data = await loadPersistedState<unknown>(name);
    return data === null ? null : JSON.stringify(data);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await savePersistedState(name, JSON.parse(value) as unknown);
  },
  removeItem: async (name: string): Promise<void> => {
    await removePersistedState(name);
  },
};
