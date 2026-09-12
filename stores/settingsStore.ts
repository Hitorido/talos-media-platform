import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appPersistStorage } from '@/stores/persistStorage';

const MAX_SEARCH_HISTORY = 8;

type SettingsState = {
  searchHistory: string[];
  preferredLanguage: string;
  addSearchHistory: (term: string) => void;
  removeSearchHistory: (term: string) => void;
  clearSearchHistory: () => void;
  setPreferredLanguage: (language: string) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      searchHistory: ['Stellar Horizon', 'Iron Bloom', 'fantasy'],
      preferredLanguage: 'en',

      addSearchHistory: (term) => {
        const normalized = term.trim();
        if (!normalized) return;

        set((state) => {
          const next = [
            normalized,
            ...state.searchHistory.filter(
              (item) => item.toLowerCase() !== normalized.toLowerCase(),
            ),
          ];
          return { searchHistory: next.slice(0, MAX_SEARCH_HISTORY) };
        });
      },

      removeSearchHistory: (term) => {
        set((state) => ({
          searchHistory: state.searchHistory.filter((item) => item !== term),
        }));
      },

      clearSearchHistory: () => {
        set({ searchHistory: [] });
      },

      setPreferredLanguage: (language) => {
        set({ preferredLanguage: language.trim() || 'en' });
      },
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => appPersistStorage),
      partialize: (state) => ({
        searchHistory: state.searchHistory,
        preferredLanguage: state.preferredLanguage,
      }),
    },
  ),
);
