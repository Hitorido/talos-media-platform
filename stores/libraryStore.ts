import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appPersistStorage } from '@/stores/persistStorage';
import type { LibraryEntry, LibraryMedia, LibraryMediaType, LibraryStatus } from '@/types/library';

type LibraryState = {
  entries: LibraryEntry[];
  media: Record<string, LibraryMedia>;
  rememberMedia: (media: LibraryMedia) => void;
  tags: string[];
  addToLibrary: (mediaId: string, mediaType: LibraryMediaType) => void;
  removeFromLibrary: (mediaId: string, mediaType: LibraryMediaType) => void;
  toggleFavorite: (mediaId: string, mediaType: LibraryMediaType) => void;
  saveFavorite: (mediaId: string, mediaType: LibraryMediaType, tags: string[]) => void;
  addTag: (tag: string) => void;
  setStatus: (mediaId: string, mediaType: LibraryMediaType, status: LibraryStatus) => void;
  isInLibrary: (mediaId: string, mediaType: LibraryMediaType) => boolean;
  isFavorite: (mediaId: string, mediaType: LibraryMediaType) => boolean;
};

const initialEntries: LibraryEntry[] = [
  {
    mediaId: 'anime-cw-1',
    mediaType: 'anime',
    status: 'watching',
    isFavorite: false,
    tags: [],
    addedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    mediaId: 'manga-cw-1',
    mediaType: 'manhwa',
    status: 'reading',
    isFavorite: true,
    tags: ['Favorites'],
    addedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    mediaId: 'manga-cw-2',
    mediaType: 'manhua',
    status: 'reading',
    isFavorite: false,
    tags: [],
    addedAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    mediaId: 'novel-t-1',
    mediaType: 'novel',
    status: 'reading',
    isFavorite: true,
    tags: ['Favorites'],
    addedAt: Date.now(),
    updatedAt: Date.now(),
  },
];

function findEntry(entries: LibraryEntry[], mediaId: string, mediaType: LibraryMediaType) {
  return entries.find((entry) => entry.mediaId === mediaId && entry.mediaType === mediaType);
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
  entries: initialEntries,
  media: {},
  rememberMedia: (media) => set(state => JSON.stringify(state.media[media.id]) === JSON.stringify(media) ? state : ({media:{...state.media,[media.id]:media}})),
  tags: ['Favorites'],

  addToLibrary: (mediaId, mediaType) => {
    set((state) => {
      if (findEntry(state.entries, mediaId, mediaType)) return state;
      const now = Date.now();
      return {
        entries: [
          ...state.entries,
          {
            mediaId,
            mediaType,
            status: mediaType === 'anime' ? 'plan-to-watch' : 'plan-to-read',
            isFavorite: false,
            tags: [],
            addedAt: now,
            updatedAt: now,
          },
        ],
      };
    });
  },

  removeFromLibrary: (mediaId, mediaType) => {
    set((state) => ({
      entries: state.entries.filter(
        (entry) => !(entry.mediaId === mediaId && entry.mediaType === mediaType),
      ),
    }));
  },

  toggleFavorite: (mediaId, mediaType) => {
    set((state) => {
      const entry = findEntry(state.entries, mediaId, mediaType);
      if (!entry) {
        const now = Date.now();
        return {
          entries: [
            ...state.entries,
            {
              mediaId,
              mediaType,
              status: mediaType === 'anime' ? 'plan-to-watch' : 'plan-to-read',
              isFavorite: true,
              tags: ['Favorites'],
              addedAt: now,
              updatedAt: now,
            },
          ],
        };
      }

      return {
        entries: state.entries.map((item) =>
          item === entry
            ? {
                ...item,
                isFavorite: !item.isFavorite,
                tags: !item.isFavorite && item.tags.length === 0 ? ['Favorites'] : item.tags,
                updatedAt: Date.now(),
              }
            : item,
        ),
      };
    });
  },

  saveFavorite: (mediaId, mediaType, tags) => {
    set((state) => ({
      entries: state.entries.map((entry) =>
        entry.mediaId === mediaId && entry.mediaType === mediaType
          ? { ...entry, isFavorite: true, tags, updatedAt: Date.now() }
          : entry,
      ),
    }));
  },

  addTag: (tag) => {
    const normalizedTag = tag.trim();
    if (!normalizedTag) return;
    set((state) =>
      state.tags.includes(normalizedTag) ? state : { tags: [...state.tags, normalizedTag] },
    );
  },

  setStatus: (mediaId, mediaType, status) => {
    set((state) => ({
      entries: state.entries.map((entry) =>
        entry.mediaId === mediaId && entry.mediaType === mediaType
          ? { ...entry, status, updatedAt: Date.now() }
          : entry,
      ),
    }));
  },

  isInLibrary: (mediaId, mediaType) => Boolean(findEntry(get().entries, mediaId, mediaType)),
  isFavorite: (mediaId, mediaType) =>
    findEntry(get().entries, mediaId, mediaType)?.isFavorite ?? false,
    }),
    {
      name: 'library',
      storage: createJSONStorage(() => appPersistStorage),
      partialize: (state) => ({
        entries: state.entries,
        media: state.media,
        tags: state.tags,
      }),
    },
  ),
);
