import { useState } from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { useAnimeProgressStore } from '@/stores/animeProgressStore';
import { useMangaProgressStore } from '@/stores/mangaProgressStore';
import { useNovelProgressStore } from '@/stores/novelProgressStore';
import type { DownloadGroup } from '@/services/downloadGroups';
import type { DownloadItem } from '@/types/download';

export function DownloadTitleCard({
  group,
  children,
}: {
  group: DownloadGroup;
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
      <View className="flex-row items-center gap-3 bg-neutral-100 p-3 dark:bg-neutral-900">
        <Pressable
          className="absolute inset-0"
          onPress={() => (resume ? open(resume) : router.push(details))}
          accessibilityLabel={resume ? `Continue ${group.title}` : `Details for ${group.title}`}
        />
        <View pointerEvents="none">
          <Image
            source={group.coverUrl?.trim() ? { uri: group.coverUrl } : undefined}
            style={{ width: 40, height: 56, borderRadius: 6 }}
          />
        </View>
        <View pointerEvents="box-none" className="flex-1 gap-1">
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              router.push(details);
            }}
            accessibilityLabel={`Details for ${group.title}`}
          >
            <Text variant="label" numberOfLines={2}>
              {group.title}
            </Text>
          </Pressable>
          <View pointerEvents="none">
            <Text variant="caption" tone="muted">
              {downloaded.length} saved / {group.items.length} total
            </Text>
            {resume ? (
              <Text variant="caption" tone="primary" numberOfLines={1}>
                Continue: {resume.unitTitle}
              </Text>
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
          className="rounded-full bg-neutral-200 p-3 dark:bg-neutral-800"
        >
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#8b5cf6" />
        </Pressable>
      </View>
      {expanded ? (
        <View className="gap-2 p-2">
          {children ??
            downloaded.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => open(item)}
                className="rounded-lg bg-neutral-100 p-3 dark:bg-neutral-900"
              >
                <Text>{item.unitTitle}</Text>
              </Pressable>
            ))}
        </View>
      ) : null}
    </View>
  );
}
