import { useLibraryStore } from '@/stores/libraryStore';

export function useMediaCover(mediaId: string | undefined, fallback: string): string {
  const customCoverUrl = useLibraryStore((state) =>
    mediaId ? (state.media[mediaId]?.customCoverUrl?.trim() || state.media[mediaId]?.originalCoverUrl) : undefined,
  );
  return customCoverUrl?.trim() || fallback;
}
