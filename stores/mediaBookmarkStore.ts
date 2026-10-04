import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appPersistStorage } from '@/stores/persistStorage';
export type MediaBookmark = {
  id: string;
  mediaId: string;
  kind: 'manga' | 'anime';
  unitId: string;
  unitTitle: string;
  position: number;
  previewUri?: string;
  progress?: number;
  view?: { fraction: number; scale: number; pan: number; mode?: 'vertical' | 'horizontal' };
  createdAt: number;
};
type State = {
  save: (bookmark: Omit<MediaBookmark, 'id' | 'createdAt'>) => void;
  bookmarks: MediaBookmark[];
  toggle: (bookmark: Omit<MediaBookmark, 'id' | 'createdAt'>) => void;
  remove: (id: string) => void;
};
export const useMediaBookmarkStore = create<State>()(
  persist(
    (set) => ({
      bookmarks: [],
      save: (bookmark) => {
        if (
          !bookmark.mediaId ||
          !bookmark.unitId ||
          !Number.isFinite(bookmark.position) ||
          bookmark.position < 0
        )
          return;
        set((state) => ({
          bookmarks: [
            {
              ...bookmark,
              position: Math.floor(bookmark.position),
              id: Date.now() + '-' + Math.random().toString(36).slice(2),
              createdAt: Date.now(),
            },
            ...state.bookmarks,
          ],
        }));
      },
      toggle: (bookmark) => {
        if (
          !bookmark.mediaId ||
          !bookmark.unitId ||
          !Number.isFinite(bookmark.position) ||
          bookmark.position < 0
        )
          return;
        const position = Math.floor(bookmark.position),
          id = JSON.stringify([bookmark.kind, bookmark.mediaId, bookmark.unitId, position]);
        set((state) => ({
          bookmarks: state.bookmarks.some((b) => b.id === id)
            ? state.bookmarks.filter((b) => b.id !== id)
            : [{ ...bookmark, position, id, createdAt: Date.now() }, ...state.bookmarks],
        }));
      },
      remove: (id) => set((state) => ({ bookmarks: state.bookmarks.filter((b) => b.id !== id) })),
    }),
    {
      name: 'media-bookmarks',
      storage: createJSONStorage(() => appPersistStorage),
      skipHydration: true,
    },
  ),
);
