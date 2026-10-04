import { Text } from '@/components/ui';
import { animeWatchHref, mangaReadHref, novelReadHref } from '@/lib/routes';
import { removeBookmarkPreview } from '@/services/bookmarkPreview';
import { useLibraryStore } from '@/stores/libraryStore';
import { useMediaBookmarkStore } from '@/stores/mediaBookmarkStore';
import { useNovelProgressStore } from '@/stores/novelProgressStore';
import { useRouter } from 'expo-router';
import { Image, View } from 'react-native';
import { PopPressable as Pressable } from '@/components/ui/PopPressable';

export function MediaBookmarks({
  mediaId,
  kind,
  coverUrl,
}: {
  mediaId: string;
  kind: 'anime' | 'manga' | 'novel';
  coverUrl?: string;
}) {
  const router = useRouter();
  const media = useMediaBookmarkStore((state) => state.bookmarks);
  const novels = useNovelProgressStore((state) => state.bookmarks);
  // Library cover as fallback when no frame preview is available.
  const libraryCover = useLibraryStore((state) => state.media[mediaId]?.coverUrl ?? coverUrl ?? '');

  const entries =
    kind === 'novel'
      ? novels
          .filter((b) => b.novelId === mediaId)
          .map((b) => ({
            previewUri: undefined as string | undefined,
            fallbackUri: undefined as string | undefined,
            id: b.id,
            group: b.chapterId,
            progress: b.scrollPercentage,
            title: b.chapterTitle,
            label: b.snippet || 'Saved passage',
            open: () => router.push(novelReadHref(mediaId, b.chapterId, b.scrollPercentage ?? 0)),
            remove: () => useNovelProgressStore.getState().removeBookmark(b.id),
          }))
      : media
          .filter((b) => b.mediaId === mediaId && b.kind === kind)
          .map((b) => ({
            previewUri: b.previewUri,
            // For anime bookmarks without a frame capture, fall back to library/episode cover art.
            fallbackUri: kind === 'anime' ? libraryCover || undefined : undefined,
            id: b.id,
            group: b.unitId,
            progress: b.progress,
            title: b.unitTitle,
            label:
              kind === 'anime'
                ? Math.floor(b.position / 60) + ':' + String(b.position % 60).padStart(2, '0')
                : 'Page ' + b.position,
            open: () =>
              router.push(
                kind === 'anime'
                  ? animeWatchHref(mediaId, b.unitId, b.position)
                  : mangaReadHref(mediaId, b.unitId, b.position, b.id),
              ),
            remove: () => {
              useMediaBookmarkStore.getState().remove(b.id);
              void removeBookmarkPreview(b.previewUri).catch(() => {});
            },
          }));
  const groups = [...new Set(entries.map((entry) => entry.group))];
  return (
    <View className="gap-7">
      {groups.length ? (
        groups.map((group) => {
          const saved = entries.filter((entry) => entry.group === group);
          return (
            <View key={group} className="gap-4">
              <Text variant="h3">{saved[0].title}</Text>
              <View className="flex-row flex-wrap gap-4">
                {saved.map((b) => {
                  const displayUri = b.previewUri || b.fallbackUri;
                  return (
                    <View key={b.id} style={{ width: 150 }} className="gap-2">
                      <Pressable
                        onPress={b.open}
                        accessibilityRole="button"
                        accessibilityLabel={'Open bookmark: ' + b.title + ', ' + b.label}
                        className="overflow-hidden rounded-2xl border border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900"
                        style={{ height: 205 }}
                      >
                        {displayUri ? (
                          <Image
                            source={{ uri: displayUri }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="flex-1 justify-center p-3">
                            <Text variant="caption">{b.label}</Text>
                          </View>
                        )}
                        {/* Timestamp / page label badge */}
                        <View className="absolute bottom-2 right-2 min-w-10 items-center rounded-full bg-primary-200 px-3 py-1">
                          <Text className="text-xs font-semibold text-neutral-950">{b.label}</Text>
                        </View>
                      </Pressable>
                      <Pressable
                        onPress={b.remove}
                        accessibilityRole="button"
                        accessibilityLabel="Remove bookmark"
                        className="self-start rounded-lg bg-neutral-100 px-3 py-2 dark:bg-neutral-800"
                      >
                        <Text variant="caption">Remove</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })
      ) : (
        <Text tone="muted">
          Your saved moments live here. Bookmark a page, passage or scene to return to it anytime.
        </Text>
      )}
    </View>
  );
}
