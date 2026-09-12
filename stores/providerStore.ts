import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getDefaultProviderEnabledMap, initializeProviders, providerRegistry } from '@/providers';
import { appPersistStorage } from '@/stores/persistStorage';
import type { ProviderStatus } from '@/types/provider';

type ProviderPreferences = {
  enabled: Record<string, boolean>;
  preferredByMediaType: Partial<Record<string, string>>;
  statusOverrides: Record<string, ProviderStatus>;
};

type ProviderStoreState = ProviderPreferences & {
  isProviderEnabled: (providerId: string) => boolean;
  setProviderEnabled: (providerId: string, enabled: boolean) => void;
  setPreferredProvider: (mediaType: string, providerId: string) => void;
  getPreferredProvider: (mediaType: string) => string | undefined;
  setProviderStatus: (providerId: string, status: ProviderStatus) => void;
  getProviderStatus: (providerId: string) => ProviderStatus;
};

function mergeEnabledState(
  persisted?: Record<string, boolean>,
): Record<string, boolean> {
  initializeProviders();
  const defaults = getDefaultProviderEnabledMap();
  return { ...defaults, ...persisted };
}

export const useProviderStore = create<ProviderStoreState>()(
  persist(
    (set, get) => ({
      enabled: getDefaultProviderEnabledMap(),
      preferredByMediaType: {
        manga: 'mangadex',
        manhwa: 'mangadex',
        manhua: 'mangadex',
        anime: 'kitsu-anime',
        novel: 'builtin-mock',
      },
      statusOverrides: {},

      isProviderEnabled: (providerId) => get().enabled[providerId] === true,

      setProviderEnabled: (providerId, enabled) => {
        set((state) => ({
          enabled: {
            ...state.enabled,
            [providerId]: enabled,
          },
        }));
      },

      setPreferredProvider: (mediaType, providerId) => {
        set((state) => ({
          preferredByMediaType: {
            ...state.preferredByMediaType,
            [mediaType]: providerId,
          },
        }));
      },

      getPreferredProvider: (mediaType) => get().preferredByMediaType[mediaType],

      setProviderStatus: (providerId, status) => {
        set((state) => ({
          statusOverrides: {
            ...state.statusOverrides,
            [providerId]: status,
          },
        }));
      },

      getProviderStatus: (providerId) => {
        const override = get().statusOverrides[providerId];
        if (override) return override;
        initializeProviders();
        return providerRegistry.get(providerId)?.definition.status ?? 'unavailable';
      },
    }),
    {
      name: 'providers',
      storage: createJSONStorage(() => appPersistStorage),
      partialize: (state) => ({
        enabled: state.enabled,
        preferredByMediaType: state.preferredByMediaType,
        statusOverrides: state.statusOverrides,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<ProviderPreferences> | undefined;
        return {
          ...current,
          ...saved,
          enabled: mergeEnabledState(saved?.enabled),
          preferredByMediaType: {
            ...current.preferredByMediaType,
            ...saved?.preferredByMediaType,
          },
          statusOverrides: {
            ...current.statusOverrides,
            ...saved?.statusOverrides,
          },
        };
      },
    },
  ),
);
