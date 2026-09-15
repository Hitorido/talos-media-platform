import { apiRequest } from '@/services/api/client';

export type BackendProfile = {
  id: string;
  userId: string;
  bio: string | null;
  preferredLanguage: string;
  preferredTheme: string;
  createdAt: string;
  updatedAt: string;
};

export type BackendUser = {
  id: string;
  email: string;
  username: string;
  role: string;
  avatarUrl: string | null;
  profile: BackendProfile | null;
};

export type AuthResponse = {
  token: string;
  user: BackendUser;
};

export type LibraryEntryDto = {
  id: string;
  userId: string;
  mediaId: string;
  providerId: string;
  sourceId: string;
  mediaType: string;
  title: string;
  coverUrl: string;
  status: string;
  isFavorite: boolean;
  currentChapter: string | null;
  currentEpisode: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function registerAccount(input: {
  email: string;
  username: string;
  password: string;
}) {
  return apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: input,
  });
}

export async function loginAccount(input: { emailOrUsername: string; password: string }) {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: input,
  });
}

export async function fetchCurrentUser(token?: string) {
  return apiRequest<{ user: BackendUser }>('/api/auth/me', { token });
}

export async function logoutAccount() {
  return apiRequest<{ message?: string }>('/api/auth/logout', { method: 'POST' });
}

export async function updateProfile(input: {
  bio?: string;
  preferredLanguage?: string;
  preferredTheme?: string;
  avatarUrl?: string;
}) {
  return apiRequest<{ profile: BackendProfile }>('/api/user/profile', {
    method: 'PATCH',
    body: input,
  });
}

export async function fetchLibrary() {
  return apiRequest<{ library: LibraryEntryDto[] }>('/api/library');
}

export async function upsertLibraryItem(item: {
  mediaId: string;
  providerId: string;
  sourceId: string;
  mediaType: string;
  title: string;
  coverUrl: string;
  status?: string;
  isFavorite?: boolean;
  currentChapter?: string;
  currentEpisode?: string;
}) {
  return apiRequest<{ entry: LibraryEntryDto }>('/api/library', {
    method: 'POST',
    body: item,
  });
}

export async function removeLibraryItem(mediaId: string) {
  return apiRequest<{ message?: string }>(`/api/library/${encodeURIComponent(mediaId)}`, {
    method: 'DELETE',
  });
}

export async function fetchFavorites() {
  return apiRequest<{ favorites: LibraryEntryDto[] }>('/api/favorites');
}

export async function fetchHistory(limit = 50) {
  return apiRequest<{ history: unknown[] }>(`/api/history?limit=${limit}`);
}

export async function fetchProgress(mediaId?: string) {
  const query = mediaId ? `?mediaId=${encodeURIComponent(mediaId)}` : '';
  return apiRequest<{ reading: unknown[]; watching: unknown[] }>(`/api/progress${query}`);
}

export async function fetchProviderAdapters() {
  return apiRequest<{ adapters: unknown[]; providers?: unknown[] }>('/api/providers');
}

export async function fetchProviderHealth() {
  return apiRequest<{
    status: string;
    adapters: number;
    enabled: number;
    usable: number;
    note?: string;
    providers: {
      id: string;
      status: string;
      enabled: boolean;
      health?: {
        lastSuccessAt?: number;
        lastFailureAt?: number;
        lastResponseMs?: number;
        lastError?: string;
      };
    }[];
  }>('/api/providers/health');
}
