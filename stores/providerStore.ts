import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  getDefaultProviderEnabledMap,
  initializeProviders,
  providerRegistry,
  RESTORED_SOURCE_IDS,
} from '@/providers';
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

/**
 * Bumped whenever provider registration or defaults change so one-time
 * migrations run exactly once. After migrating, persisted user enable/disable
 * choices are preserved on every later launch.
 */
const PROVIDER_STATE_VERSION = 2;

/** Consumet is excluded from active providers and must not appear in saved state. */
const CONSUMET_ID_PATTERN = /consumet/i;

function isConsumetId(value: string | undefined): boolean {
  return Boolean(value && CONSUMET_ID_PATTERN.test(value));
}

function mergeEnabledState(persisted?: Record<string, boolean>): Record<string, boolean> {
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
        novel: 'novelcodex',
      },
      statusOverrides: {},

      isProviderEnabled: (providerId) => get().enabled[providerId] === true,

      setProviderEnabled: (providerId, enabled) => {
        set((state) => {
          const preferredByMediaType = { ...state.preferredByMediaType };
          if (!enabled) {
            for (const [mediaType, preferredId] of Object.entries(preferredByMediaType)) {
              if (preferredId === providerId) delete preferredByMediaType[mediaType];
            }
          }
          return {
            enabled: { ...state.enabled, [providerId]: enabled },
            preferredByMediaType,
          };
        });
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
      version: PROVIDER_STATE_VERSION,
      storage: createJSONStorage(() => appPersistStorage),
      partialize: (state) => ({
        enabled: state.enabled,
        preferredByMediaType: state.preferredByMediaType,
        statusOverrides: state.statusOverrides,
      }),
      migrate: (persisted, version) => {
        const saved = persisted as Partial<ProviderPreferences> | undefined;
        const enabled: Record<string, boolean> = { ...saved?.enabled };
        const preferredByMediaType = { ...saved?.preferredByMediaType };
        const statusOverrides: Record<string, ProviderStatus> = { ...saved?.statusOverrides };

        // Drop stale/removed Consumet entries so they never reappear in Sources.
        for (const id of Object.keys(enabled)) if (isConsumetId(id)) delete enabled[id];
        for (const id of Object.keys(statusOverrides))
          if (isConsumetId(id)) delete statusOverrides[id];
        for (const [mediaType, providerId] of Object.entries(preferredByMediaType)) {
          if (isConsumetId(providerId)) delete preferredByMediaType[mediaType];
        }

        // One-time restoration only: an earlier build disabled backend-backed sources
        // while the Render gateway was temporarily unreachable. Re-enable them once,
        // and clear stale failure overrides so they show as usable again.
        if (version < PROVIDER_STATE_VERSION) {
          for (const providerId of RESTORED_SOURCE_IDS) {
            enabled[providerId] = true;
            delete statusOverrides[providerId];
          }
          if (!preferredByMediaType.novel || preferredByMediaType.novel === 'builtin-mock') {
            preferredByMediaType.novel = 'novelcodex';
          }
        }

        return { ...saved, enabled, preferredByMediaType, statusOverrides };
      },
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
