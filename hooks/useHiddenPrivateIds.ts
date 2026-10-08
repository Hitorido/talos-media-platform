import { useMemo } from 'react';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePrivacyStore } from '@/stores/privacyStore';
export function useHiddenPrivateIds() {
  const entries = useLibraryStore((s) => s.entries),
    unlocked = usePrivacyStore((s) => s.unlocked);
  return useMemo(
    () =>
      new Set(
        unlocked ? [] : entries.filter((e) => e.tags.includes('Private')).map((e) => e.mediaId),
      ),
    [entries, unlocked],
  );
}
