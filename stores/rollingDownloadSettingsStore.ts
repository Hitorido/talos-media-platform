import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appPersistStorage } from '@/stores/persistStorage';

export type RollingDownloadWindow = 5 | 10 | 15 | 20;

type RollingDownloadSettingsState = {
  enabled: boolean;
  windowSize: RollingDownloadWindow;
  setEnabled: (enabled: boolean) => void;
  setWindowSize: (windowSize: RollingDownloadWindow) => void;
};

export const useRollingDownloadSettingsStore = create<RollingDownloadSettingsState>()(
  persist(
    (set) => ({
      enabled: false,
      windowSize: 5,
      setEnabled: (enabled) => set({ enabled }),
      setWindowSize: (windowSize) => set({ windowSize }),
    }),
    {
      name: 'rolling-download-settings',
      storage: createJSONStorage(() => appPersistStorage),
      partialize: (state) => ({ enabled: state.enabled, windowSize: state.windowSize }),
    },
  ),
);
