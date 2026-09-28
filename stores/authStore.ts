import { create } from 'zustand';
import {
  ApiError,
  fetchCurrentUser,
  loginAccount,
  logoutAccount,
  registerAccount,
  setApiAuthTokenProvider,
  type BackendUser,
} from '@/services/api';
import { readAuthToken, writeAuthToken } from '@/services/authTokenStorage';

type AuthState = {
  token: string | null;
  user: BackendUser | null;
  isHydrated: boolean;
  setHydrated: (value: boolean) => void;
  hydrate: () => Promise<void>;
  register: (input: { email: string; username: string; password: string }) => Promise<BackendUser>;
  login: (input: { emailOrUsername: string; password: string }) => Promise<BackendUser>;
  refreshMe: () => Promise<BackendUser | null>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: null,
  user: null,
  isHydrated: false,
  setHydrated: (value) => set({ isHydrated: value }),
  hydrate: async () => {
    try {
      const token = await readAuthToken();
      set({ token });
    } finally {
      set({ isHydrated: true });
    }
    // Cloud cold starts must not hold the splash screen open.
    void get().refreshMe();
  },
  register: async (input) => {
    const data = await registerAccount(input);
    await writeAuthToken(data.token);
    set({ token: data.token, user: data.user });
    return data.user;
  },
  login: async (input) => {
    const data = await loginAccount(input);
    await writeAuthToken(data.token);
    set({ token: data.token, user: data.user });
    return data.user;
  },
  refreshMe: async () => {
    const token = get().token;
    if (!token) return null;
    try {
      const data = await fetchCurrentUser(token);
      if (get().token === token) set({ user: data.user });
      return data.user;
    } catch (error) {
      if (get().token === token && error instanceof ApiError && [401, 404].includes(error.status)) {
        set({ token: null, user: null });
        await writeAuthToken(null).catch(() => undefined);
      }
      // Keep sessions on offline, timeout and server errors.
      return null;
    }
  },
  logout: async () => {
    const request = get().token ? logoutAccount().catch(() => undefined) : Promise.resolve();
    set({ token: null, user: null });
    await writeAuthToken(null);
    await request;
  },
}));

setApiAuthTokenProvider(() => useAuthStore.getState().token);
