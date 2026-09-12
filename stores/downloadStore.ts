import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appPersistStorage } from '@/stores/persistStorage';
import type { DownloadItem, DownloadMediaType, DownloadStatus } from '@/types/download';

export type EnqueueDownloadParams = {
  mediaId: string;
  mediaType: DownloadMediaType;
  mediaTitle: string;
  coverUrl: string;
  providerId?: string;
  sourceId?: string;
  unitId: string;
  unitTitle: string;
  unitNumber: number;
  payload: {
    videoUrl?: string;
    pageUrls?: string[];
    paragraphs?: string[];
    wordCount?: number;
  };
};

type DownloadState = {
  items: Record<string, DownloadItem>;
  enqueueDownload: (params: EnqueueDownloadParams) => string;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  cancelDownload: (id: string) => void;
  retryDownload: (id: string) => void;
  deleteDownload: (id: string) => void;
  clearCompleted: () => void;
  updateProgress: (
    id: string,
    update: { progress: number; bytesDownloaded: number; totalBytes: number },
  ) => void;
  setStatus: (
    id: string,
    status: DownloadStatus,
    extra?: Partial<Omit<DownloadItem, 'id' | 'status'>>,
  ) => void;
  getDownload: (mediaId: string, unitId: string) => DownloadItem | undefined;
  isDownloaded: (mediaId: string, unitId: string) => boolean;
};

export function createDownloadId(mediaType: string, mediaId: string, unitId: string): string {
  return `${mediaType}:${mediaId}:${unitId}`;
}

export const useDownloadStore = create<DownloadState>()(
  persist(
    (set, get) => ({
      items: {},

      enqueueDownload: (params) => {
        const id = createDownloadId(params.mediaType, params.mediaId, params.unitId);
        const existing = get().items[id];
        if (existing && (existing.status === 'completed' || existing.status === 'downloading')) {
          return id;
        }

        const now = Date.now();
        const item: DownloadItem = {
          id,
          mediaId: params.mediaId,
          mediaType: params.mediaType,
          mediaTitle: params.mediaTitle,
          coverUrl: params.coverUrl,
          providerId: params.providerId ?? 'builtin-mock',
          sourceId: params.sourceId ?? 'mock-default',
          unitId: params.unitId,
          unitTitle: params.unitTitle,
          unitNumber: params.unitNumber,
          status: 'queued',
          progress: 0,
          bytesDownloaded: 0,
          totalBytes: 0,
          localPath: null,
          error: null,
          createdAt: now,
          updatedAt: now,
          payload: params.payload,
        };

        set((state) => ({
          items: {
            ...state.items,
            [id]: item,
          },
        }));

        return id;
      },

      pauseDownload: (id) => {
        set((state) => {
          const item = state.items[id];
          if (!item || (item.status !== 'downloading' && item.status !== 'queued')) {
            return state;
          }
          return {
            items: {
              ...state.items,
              [id]: {
                ...item,
                status: 'paused',
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      resumeDownload: (id) => {
        set((state) => {
          const item = state.items[id];
          if (!item || (item.status !== 'paused' && item.status !== 'failed')) {
            return state;
          }
          return {
            items: {
              ...state.items,
              [id]: {
                ...item,
                status: 'queued',
                error: null,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      cancelDownload: (id) => {
        set((state) => {
          const item = state.items[id];
          if (!item) return state;
          return {
            items: {
              ...state.items,
              [id]: {
                ...item,
                status: 'cancelled',
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      retryDownload: (id) => {
        set((state) => {
          const item = state.items[id];
          if (!item) return state;
          return {
            items: {
              ...state.items,
              [id]: {
                ...item,
                status: 'queued',
                progress: 0,
                bytesDownloaded: 0,
                error: null,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      deleteDownload: (id) => {
        set((state) => {
          const next = { ...state.items };
          delete next[id];
          return { items: next };
        });
      },

      clearCompleted: () => {
        set((state) => {
          const next: Record<string, DownloadItem> = {};
          for (const [key, val] of Object.entries(state.items)) {
            if (val.status !== 'completed' && val.status !== 'cancelled') {
              next[key] = val;
            }
          }
          return { items: next };
        });
      },

      updateProgress: (id, update) => {
        set((state) => {
          const item = state.items[id];
          if (!item) return state;
          return {
            items: {
              ...state.items,
              [id]: {
                ...item,
                progress: update.progress,
                bytesDownloaded: update.bytesDownloaded,
                totalBytes: update.totalBytes,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      setStatus: (id, status, extra) => {
        set((state) => {
          const item = state.items[id];
          if (!item) return state;
          return {
            items: {
              ...state.items,
              [id]: {
                ...item,
                ...extra,
                status,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      getDownload: (mediaId, unitId) => {
        const items = Object.values(get().items);
        return items.find((item) => item.mediaId === mediaId && item.unitId === unitId);
      },

      isDownloaded: (mediaId, unitId) => {
        const item = get().getDownload(mediaId, unitId);
        return item?.status === 'completed' && Boolean(item.localPath);
      },
    }),
    {
      name: 'downloads',
      storage: createJSONStorage(() => appPersistStorage),
      partialize: (state) => ({
        items: state.items,
      }),
    },
  ),
);
