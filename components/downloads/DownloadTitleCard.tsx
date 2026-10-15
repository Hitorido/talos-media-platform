import { getProviderDisplayName } from '@/services/contentService';
import { downloadTitleKey } from '@/services/downloadGroups';
import { SwipeableRow } from '@/components/ui/SwipeableRow';
import { deleteDownload } from '@/services/downloadService';
import { SavedChapterPager } from './SavedChapterPager';
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
import { Image, View, Modal, FlatList } from 'react-native';

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
  const [source, setSource] = useState<string | null>(null);
  const [pickerIntent, setPickerIntent] = useState<'read' | 'details'>('read');
  const router = useRouter();
  const sources = [...new Set(group.items.map((item) => item.mediaId))];
  const sourceItems = group.items.filter((item) => item.mediaId === (source ?? sources[0]));
  const showSaved = (intent: 'read' | 'details' = 'read') => {
    setSource(sources.length === 1 ? sources[0] : null);
    setPickerIntent(intent);
    setExpanded(true);
  };
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

  const deleteTitle = () => {
    const all = Object.values(useDownloadStore.getState().items).filter(
      (item) => downloadTitleKey(item) === downloadTitleKey(first),
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
            useAnimeProgressStore.getState().getEpisodeProgress(item.mediaId, item.unitId)
              ?.positionSeconds ?? 0,
          )
        : item.mediaType === 'novel'
          ? novelReadHref(
              item.mediaId,
              item.unitId,
              useNovelProgressStore.getState().progressByNovel[item.mediaId]?.chapterId ===
                item.unitId
                ? useNovelProgressStore.getState().progressByNovel[item.mediaId].scrollPercentage
                : 0,
            )
          : mangaReadHref(
              item.mediaId,
              item.unitId,
              useMangaProgressStore.getState().progressByManga[item.mediaId]?.chapterId ===
                item.unitId
                ? useMangaProgressStore.getState().progressByManga[item.mediaId].pageNumber
                : 1,
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
            onPress={() =>
              sources.length > 1 ? showSaved() : resume ? open(resume) : router.push(details)
            }
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
                if (sources.length > 1) showSaved('details');
                else router.push(details);
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
              showSaved();
            }}
            accessibilityLabel="Show downloaded chapters or episodes"
            accessibilityState={{ expanded }}
            style={poster ? { height: 36 } : undefined}
            className="flex-row items-center justify-center gap-1 rounded-xl bg-primary-100 px-1 py-1 dark:bg-primary-950"
          >
            <Text variant="caption" numberOfLines={1} style={{ flexShrink: 1, fontSize: 10 }}>
              Saved {first.mediaType === 'anime' ? 'episodes' : 'chapters'}
            </Text>
            <Ionicons name="list-outline" size={14} color="#8b5cf6" />
          </Pressable>
        </View>
      </SwipeableRow>
      <Modal
        visible={expanded}
        transparent
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
      >
        <View className="flex-1 justify-center bg-black/60 px-5">
          <Pressable
            className="absolute inset-0"
            onPress={() => setExpanded(false)}
            accessibilityLabel="Close saved chapters"
          />
          <View className="max-h-[75%] w-full max-w-lg self-center rounded-2xl bg-white p-4 dark:bg-neutral-900">
            <Text variant="h3" numberOfLines={2}>
              {group.title}
            </Text>
            {sources.length > 1 && source ? (
              <Pressable onPress={() => setSource(null)} className="py-3">
                <Text tone="primary">Change source</Text>
              </Pressable>
            ) : null}
            {!source && sources.length > 1 ? (
              <FlatList
                data={sources}
                keyExtractor={(item) => item}
                renderItem={({ item: mediaId }) => {
                  const entries = group.items.filter((item) => item.mediaId === mediaId);
                  return (
                    <Pressable
                      className="my-2 rounded-xl border border-primary-400 bg-primary-100 p-3 dark:bg-primary-950"
                      onPress={() => {
                        if (pickerIntent === 'details') {
                          setExpanded(false);
                          router.push(
                            first.mediaType === 'anime'
                              ? animeDetailsHref(mediaId)
                              : first.mediaType === 'novel'
                                ? novelDetailsHref(mediaId)
                                : mangaDetailsHref(mediaId),
                          );
                        } else setSource(mediaId);
                      }}
                    >
                      <Text>{getProviderDisplayName(entries[0].providerId)}</Text>
                      <Text variant="caption">
                        {entries.filter((item) => item.status === 'completed').length} downloaded
                      </Text>
                    </Pressable>
                  );
                }}
              />
            ) : (
              (children ?? (
                <SavedChapterPager
                  key={source ?? sources[0]}
                  items={sourceItems}
                  onOpen={(item) => {
                    setExpanded(false);
                    open(item);
                  }}
                />
              ))
            )}
            <Pressable onPress={() => setExpanded(false)} className="self-end p-3">
              <Text tone="primary">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
