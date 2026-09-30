import { appPersistStorage } from '@/stores/persistStorage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type SubtitleFontSize = 14 | 16 | 18 | 20 | 24;
export type SubtitleColor = 'white' | 'yellow';

export type SubtitlePreferences = {
  fontSize: SubtitleFontSize;
  color: SubtitleColor;
  background: boolean;
  backgroundOpacity: number;
  outline: boolean;
};

const defaults: SubtitlePreferences = {
  fontSize: 16,
  color: 'white',
  background: false,
  backgroundOpacity: 0.6,
  outline: true,
};

type State = SubtitlePreferences & {
  update: (prefs: Partial<SubtitlePreferences>) => void;
};

export const useSubtitlePreferencesStore = create<State>()(
  persist(
    (set) => ({
      ...defaults,
      update: (prefs) => set((state) => ({ ...state, ...prefs })),
    }),
    {
      name: 'subtitle-preferences',
      storage: createJSONStorage(() => appPersistStorage),
      skipHydration: true,
    },
  ),
);
