import { loadPersistedState, savePersistedState } from '@/services/persistenceService';
import { useDownloadStore } from '@/stores/downloadStore';
import type { AnimeDetails } from '@/types/anime';
import type { MangaDetails } from '@/types/manga';
import type { NovelDetails } from '@/types/novel';

type Catalogs = { anime: AnimeDetails; manga: MangaDetails; novel: NovelDetails };
type Snapshot = { kind: keyof Catalogs; details: Catalogs[keyof Catalogs] };
const memory = new Map<string, Snapshot>();
const pending = new Map<string, Promise<void>>();
const writes = new WeakMap<object, Promise<void>>();
const key = (id: string) => {
  let a = 2166136261,
    b = 5381;
  for (let i = 0; i < id.length; i++) {
    a = Math.imul(a ^ id.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ id.charCodeAt(i);
  }
  return 'offline-catalog-' + (a >>> 0).toString(16) + '-' + (b >>> 0).toString(16);
};

/** Keep the full catalog beside downloads, without duplicating text or signed stream URLs. */
export function saveOfflineCatalog<K extends keyof Catalogs>(
  kind: K,
  details: Catalogs[K],
): Promise<void> {
  const existing = writes.get(details);
  if (existing) return existing;
  const clean =
    kind === 'anime'
      ? {
          ...details,
          episodes: (details as AnimeDetails).episodes.map((ep) => ({ ...ep, streamUrl: '' })),
        }
      : kind === 'novel'
        ? {
            ...details,
            chapters: (details as NovelDetails).chapters.map((ch) => ({ ...ch, paragraphs: [] })),
          }
        : {
            ...details,
            chapters: (details as MangaDetails).chapters.map((ch) => ({ ...ch, pages: [] })),
          };
  const snapshot: Snapshot = { kind, details: clean as Catalogs[K] };
  memory.set(details.id, snapshot);
  if (memory.size > 50) memory.delete(memory.keys().next().value!);
  const previous = pending.get(details.id) ?? Promise.resolve();
  const write = previous.catch(() => {}).then(() => savePersistedState(key(details.id), snapshot));
  pending.set(details.id, write);
  writes.set(details, write);
  void write.then(
    () => {
      if (pending.get(details.id) === write) pending.delete(details.id);
    },
    () => {
      writes.delete(details);
    },
  );
  // The queue awaits this promise and reports storage failures before completion.
  void write.catch(() => {});
  return write;
}

export async function flushOfflineCatalog(id: string): Promise<void> {
  await pending.get(id);
}

/** Older downloads still expose their saved units without requiring a network request. */
export async function loadOfflineCatalog<K extends keyof Catalogs>(
  kind: K,
  id: string,
): Promise<Catalogs[K] | null> {
  const saved = memory.get(id) ?? (await loadPersistedState<Snapshot>(key(id)));
  if (saved?.kind === kind && saved.details.id === id) {
    memory.set(id, saved);
    if (memory.size > 50) memory.delete(memory.keys().next().value!);
    return saved.details as Catalogs[K];
  }
  const units = Object.values(useDownloadStore.getState().items)
    .filter((item) => item.mediaId === id && item.status === 'completed')
    .sort((a, b) => a.unitNumber - b.unitNumber);
  if (!units.length) return null;
  const first = units[0];
  const base = {
    id,
    title: first.mediaTitle,
    coverUrl: first.coverUrl,
    bannerUrl: first.coverUrl,
    description: 'Downloaded on this device. Connect to refresh the full catalog.',
    genres: [],
    rating: 0,
    status: 'ongoing' as const,
    author: 'Unknown',
    artist: 'Unknown',
  };
  const details =
    kind === 'anime'
      ? {
          ...base,
          episodes: units.map((item) => ({
            id: item.unitId,
            number: item.unitNumber,
            title: item.unitTitle,
            durationSeconds: 0,
            streamUrl: '',
            thumbnailUrl: first.coverUrl,
          })),
        }
      : {
          ...base,
          chapters: units.map((item) => ({
            id: item.unitId,
            number: item.unitNumber,
            title: item.unitTitle,
            releaseDate: '',
            pageCount: 0,
            pages: [],
            wordCount: 0,
            paragraphs: [],
          })),
        };
  return details as unknown as Catalogs[K];
}
