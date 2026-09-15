import type { ProviderHealth } from '@/types/provider';
import { create } from 'zustand';

type ProviderHealthState = {
  healthByProvider: Record<string, ProviderHealth>;
  recordSuccess: (providerId: string, responseMs: number) => void;
  recordFailure: (providerId: string, error: string, responseMs?: number) => void;
  setHealth: (providerId: string, health: ProviderHealth) => void;
  getHealth: (providerId: string) => ProviderHealth | undefined;
};

export const useProviderHealthStore = create<ProviderHealthState>()((set, get) => ({
  healthByProvider: {},

  recordSuccess: (providerId, responseMs) => {
    set((state) => ({
      healthByProvider: {
        ...state.healthByProvider,
        [providerId]: {
          ...state.healthByProvider[providerId],
          lastSuccessAt: Date.now(),
          lastResponseMs: responseMs,
          lastError: undefined,
        },
      },
    }));
  },

  recordFailure: (providerId, error, responseMs) => {
    set((state) => ({
      healthByProvider: {
        ...state.healthByProvider,
        [providerId]: {
          ...state.healthByProvider[providerId],
          lastFailureAt: Date.now(),
          lastResponseMs: responseMs,
          lastError: error,
        },
      },
    }));
  },

  setHealth: (providerId, health) => {
    set((state) => ({
      healthByProvider: {
        ...state.healthByProvider,
        [providerId]: health,
      },
    }));
  },

  getHealth: (providerId) => get().healthByProvider[providerId],
}));
