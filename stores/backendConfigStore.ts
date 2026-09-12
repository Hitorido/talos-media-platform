import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appPersistStorage } from '@/stores/persistStorage';

export type BackendUrlKey = 'consumet' | 'scraper' | 'novel';

type BackendConfigState = {
  backendUrls: Partial<Record<BackendUrlKey, string>>;
  setBackendUrl: (key: BackendUrlKey, url: string | null) => void;
  getBackendUrl: (key: BackendUrlKey) => string | undefined;
  isBackendConfigured: (key: BackendUrlKey) => boolean;
};

export const useBackendConfigStore = create<BackendConfigState>()(
  persist(
    (set, get) => ({
      backendUrls: {},

      setBackendUrl: (key, url) => {
        set((state) => {
          const next = { ...state.backendUrls };
          if (!url?.trim()) {
            delete next[key];
          } else {
            next[key] = url.trim().replace(/\/$/, '');
          }
          return { backendUrls: next };
        });
      },

      getBackendUrl: (key) => get().backendUrls[key],

      isBackendConfigured: (key) => Boolean(get().backendUrls[key]?.trim()),
    }),
    {
      name: 'backend-config',
      storage: createJSONStorage(() => appPersistStorage),
      partialize: (state) => ({ backendUrls: state.backendUrls }),
    },
  ),
);

export const DEFAULT_CONSUMET_BASE = 'https://api.consumet.org';

export function getConsumetBaseUrl(): string {
  return useBackendConfigStore.getState().getBackendUrl('consumet') ?? DEFAULT_CONSUMET_BASE;
}
