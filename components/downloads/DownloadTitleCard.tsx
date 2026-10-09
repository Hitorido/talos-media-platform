import { SwipeableRow } from '@/components/ui/SwipeableRow';
import {
  deleteDownload,
  pauseDownload,
  resumeDownload,
  retryDownload,
} from '@/services/downloadService';
import { useDownloadStore } from '@/stores/downloadStore';
import { Badge } from '@/components/ui/Badge';
import { PopPressable as Pressable } from '@/components/ui/PopPressable';
import { Text } from '@/components/ui/Text';
import {
  animeDetailsHref,
  animeWatchHref,
  mangaDetailsHref,
  mangaReadHref,
  novelDetailsHref,
  novelReadHref,
} from '@/lib/routes';
import type { DownloadGroup } from '@/services/downloadGroups';
import { useAnimeProgressStore } from '@/stores/animeProgressStore';
import { useMangaProgressStore } from '@/stores/mangaProgressStore';
import { useNovelProgressStore } from '@/stores/novelProgressStore';
import type { DownloadItem } from '@/types/download';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, View } from 'react-native';

export function DownloadTitleCard({
  group,
  children,
  poster = false,
}: {
  group: DownloadGroup;
  poster?: boolean;
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const first = group.items[0];
  const anime = useAnimeProgressStore((s) => s.progressByAnime[first.mediaId]);
  const manga = useMangaProgressStore((s) => s.progressByManga[first.mediaId]);
  const novel = useNovelProgressStore((s) => s.progressByNovel[first.mediaId]);
  const downloaded = group.items.filter((item) => item.status === 'completed');
  const savedUnit =
    first.mediaType === 'anime'
      ? anime?.episodeId
      : first.mediaType === 'novel'
        ? novel?.chapterId
        : manga?.chapterId;
  const resume = downloaded.find((item) => item.unitId === savedUnit) ?? downloaded[0];
  const unitLabel = (item: DownloadItem) =>
    item.unitTitle?.trim() ||
    `${item.mediaType === 'anime' ? 'Episode' : 'Chapter'} ${item.unitNumber}`;
  const current = group.items.find((item) => item.unitId === savedUnit) ?? resume ?? first;
  const deleteTitle = () => {
    const all = Object.values(useDownloadStore.getState().items).filter(
      (item) => item.mediaId === first.mediaId && item.mediaType === first.mediaType,
    );
    void Promise.all(all.map((item) => deleteDownload(item.id)));
  };
  const details =
    first.mediaType === 'anime'
      ? animeDetailsHref(first.mediaId)
      : first.mediaType === 'novel'
        ? novelDetailsHref(first.mediaId)
        : mangaDetailsHref(first.mediaId);
  const open = (item: DownloadItem) =>
    router.push(
      item.mediaType === 'anime'
        ? animeWatchHref(
            item.mediaId,
            item.unitId,
            item.unitId === anime?.episodeId ? anime.positionSeconds : 0,
          )
        : item.mediaType === 'novel'
          ? novelReadHref(
              item.mediaId,
              item.unitId,
              item.unitId === novel?.chapterId ? novel.scrollPercentage : 0,
            )
          : mangaReadHref(
              item.mediaId,
              item.unitId,
              item.unitId === manga?.chapterId ? manga.pageNumber : 1,
            ),
    );
  return (
    <View className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <SwipeableRow
        onSwipeRight={deleteTitle}
        actionLabel="Delete title"
        actionIcon="trash-outline"
      >
        <View
          className={
            poster
              ? 'gap-2 bg-white p-2 dark:bg-neutral-900'
              : 'flex-row items-center gap-3 bg-neutral-100 p-3 dark:bg-neutral-900'
          }
        >
          <Pressable
            className="absolute inset-0"
            onPress={() => (resume ? open(resume) : router.push(details))}
            accessibilityLabel={resume ? `Continue ${group.title}` : `Details for ${group.title}`}
          />
          <View pointerEvents="none">
            <Image
              source={group.coverUrl?.trim() ? { uri: group.coverUrl } : undefined}
              style={
                poster
                  ? { width: '100%', aspectRatio: 2 / 3, borderRadius: 10 }
                  : { width: 40, height: 56, borderRadius: 6 }
              }
            />
          </View>
          <View
            pointerEvents="box-none"
            style={poster ? { height: 76 } : undefined}
            className={poster ? 'gap-1' : 'flex-1 gap-1'}
          >
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                router.push(details);
              }}
              accessibilityLabel={`Details for ${group.title}`}
            >
              <Text
                variant="label"
                numberOfLines={2}
                style={poster ? { height: 32, fontSize: 12, lineHeight: 16 } : undefined}
              >
                {group.title}
              </Text>
            </Pressable>
            <View pointerEvents="none">
              <Text
                variant="caption"
                tone="muted"
                numberOfLines={1}
                style={{ fontSize: 10, lineHeight: 16 }}
              >
                {downloaded.length} saved of {group.items.length}
              </Text>
              {resume ? (
                <View className="mt-1">
                  <Badge
                    compact={poster}
                    label={`Continue: ${unitLabel(resume)}`}
                    variant="primary"
                  />
                </View>
              ) : null}
            </View>
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            accessibilityLabel="Show downloaded chapters or episodes"
            accessibilityState={{ expanded }}
            style={poster ? { height: 36 } : undefined}
            className="flex-row items-center justify-center gap-1 rounded-xl bg-primary-100 px-1 py-1 dark:bg-primary-950"
          >
            <Text variant="caption" numberOfLines={1} style={{ flexShrink: 1, fontSize: 10 }}>
              {unitLabel(current)}
            </Text>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#8b5cf6" />
          </Pressable>
        </View>
      </SwipeableRow>
      {expanded ? (
        <View className="gap-2 p-2">
          {children ??
            group.items.map((item) => (
              <SwipeableRow
                key={item.id}
                onSwipeRight={() => void deleteDownload(item.id)}
                actionLabel="Delete"
                actionIcon="trash-outline"
              >
                <View className="gap-1 rounded-lg bg-neutral-100 p-2 dark:bg-neutral-900">
                  <Pressable disabled={item.status !== 'completed'} onPress={() => open(item)}>
                    <Text variant="caption">{unitLabel(item)}</Text>
                  </Pressable>
                  <Text
                    variant="caption"
                    tone="muted"
                    numberOfLines={1}
                    style={{ fontSize: 10, lineHeight: 16 }}
                  >
                    {item.status === 'downloading'
                      ? `${Math.round(item.progress * 100)}%`
                      : item.status}
                  </Text>
                  {item.status !== 'completed' && (
                    <Pressable
                      onPress={() =>
                        item.status === 'downloading' || item.status === 'queued'
                          ? pauseDownload(item.id)
                          : item.status === 'paused'
                            ? resumeDownload(item.id)
                            : retryDownload(item.id)
                      }
                    >
                      <Text variant="caption" tone="primary">
                        {item.status === 'downloading' || item.status === 'queued'
                          ? 'Pause'
                          : item.status === 'paused'
                            ? 'Resume'
                            : 'Retry'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </SwipeableRow>
            ))}
        </View>
      ) : null}
    </View>
  );
}
