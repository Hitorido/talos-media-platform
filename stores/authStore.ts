import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  fetchCurrentUser,
  loginAccount,
  logoutAccount,
  registerAccount,
  setApiAuthTokenProvider,
  type BackendUser,
} from '@/services/api';
import { appPersistStorage } from '@/stores/persistStorage';

type AuthState = {
  token: string | null;
  user: BackendUser | null;
  isHydrated: boolean;
  setHydrated: (value: boolean) => void;
  register: (input: {
    email: string;
    username: string;
    password: string;
  }) => Promise<BackendUser>;
  login: (input: { emailOrUsername: string; password: string }) => Promise<BackendUser>;
  refreshMe: () => Promise<BackendUser | null>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isHydrated: false,

      setHydrated: (value) => set({ isHydrated: value }),

      register: async (input) => {
        const data = await registerAccount(input);
        set({ token: data.token, user: data.user });
        return data.user;
      },

      login: async (input) => {
        const data = await loginAccount(input);
        set({ token: data.token, user: data.user });
        return data.user;
      },

      refreshMe: async () => {
        const token = get().token;
        if (!token) {
          set({ user: null });
          return null;
        }

        try {
          const data = await fetchCurrentUser(token);
          set({ user: data.user });
          return data.user;
        } catch {
          set({ token: null, user: null });
          return null;
        }
      },

      logout: async () => {
        try {
          if (get().token) {
            await logoutAccount();
          }
        } catch {
          // Local logout still succeeds if the backend is offline.
        }
        set({ token: null, user: null });
      },
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => appPersistStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

setApiAuthTokenProvider(() => useAuthStore.getState().token);
