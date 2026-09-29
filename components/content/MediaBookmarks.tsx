import { removeBookmarkPreview } from '@/services/bookmarkPreview';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui';
import { useMediaBookmarkStore } from '@/stores/mediaBookmarkStore';
import { useNovelProgressStore } from '@/stores/novelProgressStore';
import { animeWatchHref, mangaReadHref, novelReadHref } from '@/lib/routes';
export function MediaBookmarks({
  mediaId,
  kind,
}: {
  mediaId: string;
  kind: 'anime' | 'manga' | 'novel';
}) {
  const router = useRouter();
  const media = useMediaBookmarkStore((state) => state.bookmarks);
  const novels = useNovelProgressStore((state) => state.bookmarks);
  const entries =
    kind === 'novel'
      ? novels
          .filter((b) => b.novelId === mediaId)
          .map((b) => ({
            previewUri: undefined as string | undefined,
            id: b.id,
            title: b.chapterTitle,
            label: b.snippet || 'Saved passage',
            open: () => router.push(novelReadHref(mediaId, b.chapterId, b.scrollPercentage ?? 0)),
            remove: () => useNovelProgressStore.getState().removeBookmark(b.id),
          }))
      : media
          .filter((b) => b.mediaId === mediaId && b.kind === kind)
          .map((b) => ({
            previewUri: b.previewUri,
            id: b.id,
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
  return (
    <View className="gap-3">
      {entries.length ? (
        entries.map((b) => (
          <View
            key={b.id}
            className="flex-row items-center gap-3 rounded-xl bg-neutral-100 p-3 dark:bg-neutral-900"
          >
            <Pressable onPress={b.open} accessibilityRole="button" className="flex-1">
              {b.previewUri ? (
                <Image
                  source={{ uri: b.previewUri }}
                  style={{ width: 100, height: 130, borderRadius: 8, marginBottom: 8 }}
                  resizeMode="cover"
                />
              ) : null}
              <Text variant="label">{b.title}</Text>
              <Text variant="caption" tone="muted">
                {b.label}
              </Text>
            </Pressable>
            <Pressable onPress={b.remove} accessibilityLabel="Remove bookmark">
              <Text tone="primary">Remove</Text>
            </Pressable>
          </View>
        ))
      ) : (
        <Text tone="muted">
          No bookmarks yet. Save a page, passage or scene while reading or watching.
        </Text>
      )}
    </View>
  );
}
