import { PopPressable as Pressable } from '@/components/ui/PopPressable';
import { appAlert as Alert } from '@/stores/dialogStore';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  ContentPosterCard,
  ContinueReadingCard,
  ContinueWatchingCard,
  HomeHeader,
  HorizontalSection,
} from '@/components/home';
import { Screen, Text } from '@/components/ui';
import {
  animeDetailsHref,
  animeWatchHref,
  mangaDetailsHref,
  mangaReadHref,
  novelDetailsHref,
  novelReadHref,
} from '@/lib/routes';
import { emptyDiscovery, getDiscovery } from '@/services/discoveryService';
import { useAnimeProgressStore, useContinueWatching } from '@/stores/animeProgressStore';
import { useContinueReading, useMangaProgressStore } from '@/stores/mangaProgressStore';
import { useNovelPreferencesStore } from '@/stores/novelPreferencesStore';
import { useContinueReadingNovels, useNovelProgressStore } from '@/stores/novelProgressStore';
import { useProviderStore } from '@/stores/providerStore';
import { cn } from '@/utils/cn';

type ReadingCategory = 'all' | 'manga' | 'novel';

export default function HomeScreen() {
  const router = useRouter();
  const continueWatching = useContinueWatching();
  const continueReadingManga = useContinueReading();
  const continueReadingNovels = useContinueReadingNovels();
  const [readingCategory, setReadingCategory] = useState<ReadingCategory>('all');

  const removeAnimeProgress = useAnimeProgressStore((s) => s.removeEpisodeProgress);
  const removeMangaProgress = useMangaProgressStore((s) => s.removeMangaProgress);
  const removeNovelProgress = useNovelProgressStore((s) => s.removeNovelProgress);

  const novelLanguage = useNovelPreferencesStore((state) => state.language);
  const enabled = useProviderStore((state) => state.enabled);
  const [discovery, setDiscovery] = useState(emptyDiscovery);
  const [loadedDiscoveryKey, setLoadedDiscoveryKey] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  // Signature of everything that changes the discovery feed. Loading is derived
  // from it so the effect never has to cascade a synchronous setState.
  const discoveryKey = useMemo(
    () =>
      `${refresh}|${novelLanguage}|${Object.keys(enabled)
        .filter((id) => enabled[id])
        .sort()
        .join(',')}`,
    [enabled, novelLanguage, refresh],
  );
  const loadingDiscovery = loadedDiscoveryKey !== discoveryKey;

  useEffect(() => {
    let active = true;
    getDiscovery(enabled, refresh > 0, novelLanguage)
      .then((result) => {
        if (active) setDiscovery(result);
      })
      .catch(() => {
        if (active)
          setDiscovery(emptyDiscovery().map((section) => ({ ...section, unavailable: true })));
      })
      .finally(() => {
        if (active) setLoadedDiscoveryKey(discoveryKey);
      });
    return () => {
      active = false;
    };
  }, [discoveryKey, enabled, refresh, novelLanguage]);

  const combinedReadingItems = useMemo(() => {
    const mangaItems = continueReadingManga.map((item) => ({
      id: item.mangaId,
      type: 'manga' as const,
      title: item.title,
      coverUrl: item.coverUrl,
      chapter: item.chapterNumber,
      totalChapters: item.totalPages,
      progress: item.progress,
      chapterTitle: item.chapterTitle,
      chapterId: item.chapterId,
      pageNumber: 'pageNumber' in item ? item.pageNumber : undefined,
      updatedAt: item.updatedAt,
    }));

    const novelItems = continueReadingNovels.map((item) => ({
      id: item.novelId,
      type: 'novel' as const,
      title: item.title,
      coverUrl: item.coverUrl,
      chapter: item.chapterNumber,
      totalChapters: item.totalChapters,
      progress: item.scrollPercentage,
      chapterTitle: item.chapterTitle,
      chapterId: item.chapterId,
      updatedAt: item.updatedAt,
    }));

    const all = [...mangaItems, ...novelItems].sort((a, b) => b.updatedAt - a.updatedAt);
    if (readingCategory === 'manga') return all.filter((i) => i.type === 'manga');
    if (readingCategory === 'novel') return all.filter((i) => i.type === 'novel');
    return all;
  }, [continueReadingManga, continueReadingNovels, readingCategory]);

  const removeReadingItem = useCallback(
    (id: string, type: 'manga' | 'novel') => {
      if (type === 'manga') removeMangaProgress(id);
      else removeNovelProgress(id);
    },
    [removeMangaProgress, removeNovelProgress],
  );

  const removeAllReading = useCallback(() => {
    Alert.alert('Remove all', 'Remove all Continue Reading entries?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove all',
        style: 'destructive',
        onPress: () => {
          for (const item of combinedReadingItems) {
            if (item.type === 'manga') removeMangaProgress(item.id);
            else removeNovelProgress(item.id);
          }
        },
      },
    ]);
  }, [combinedReadingItems, removeMangaProgress, removeNovelProgress]);

  const removeAllWatching = useCallback(() => {
    Alert.alert('Remove all', 'Remove all Continue Watching entries?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove all',
        style: 'destructive',
        onPress: () => {
          for (const item of continueWatching) removeAnimeProgress(item.animeId);
        },
      },
    ]);
  }, [continueWatching, removeAnimeProgress]);

  return (
    <Screen scrollable contentContainerClassName="gap-8 pb-8">
      <HomeHeader />

      {/* Continue Watching */}
      <View className="gap-2">
        <View className="flex-row flex-wrap items-center justify-between gap-3 px-4">
          <Text variant="h2">Continue Watching</Text>
          {continueWatching.length > 0 ? (
            <Pressable
              onPress={removeAllWatching}
              accessibilityRole="button"
              className="shrink-0 rounded-full bg-neutral-200 px-3 py-2 dark:bg-neutral-800"
            >
              <Text variant="caption" tone="muted">
                Remove all
              </Text>
            </Pressable>
          ) : null}
        </View>
        {continueWatching.length > 0 ? (
          <HorizontalSection title="">
            {continueWatching.map((item) => (
              <View key={item.animeId} className="relative">
                <ContinueWatchingCard
                  item={{
                    id: item.animeId,
                    type: 'anime',
                    title: item.title,
                    coverUrl: item.coverUrl,
                    episode: item.episodeNumber,
                    totalEpisodes: item.totalEpisodes,
                    progress: item.progress,
                    episodeTitle: item.episodeTitle,
                  }}
                  onContinue={() => router.push(animeWatchHref(item.animeId, item.episodeId))}
                  onPress={() => router.push(animeDetailsHref(item.animeId))}
                />
                <Pressable
                  onPress={() => removeAnimeProgress(item.animeId)}
                  accessibilityRole="button"
                  accessibilityLabel="Remove from Continue Watching"
                  className="mt-1 self-start rounded-full bg-neutral-200 px-2 py-0.5 dark:bg-neutral-800"
                >
                  <Text variant="caption" tone="muted" className="text-[10px]">
                    ✕ Remove
                  </Text>
                </Pressable>
              </View>
            ))}
          </HorizontalSection>
        ) : (
          <View className="mx-4 h-28 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-100/70 px-4 dark:border-neutral-800 dark:bg-neutral-900/60">
            <Text variant="caption" tone="muted" className="text-center">
              Nothing to continue watching yet
            </Text>
          </View>
        )}
      </View>

      {/* Continue Reading */}
      <View className="gap-3">
        <View className="flex-row flex-wrap items-center justify-between gap-3 px-4">
          <Text variant="h2" className="shrink">
            Continue Reading
          </Text>
          <View className="flex-row items-center gap-3">
            {combinedReadingItems.length > 0 ? (
              <Pressable
                onPress={removeAllReading}
                accessibilityRole="button"
                className="shrink-0 rounded-full bg-neutral-200 px-3 py-2 dark:bg-neutral-800"
              >
                <Text variant="caption" tone="muted">
                  Remove all
                </Text>
              </Pressable>
            ) : null}
            {combinedReadingItems.length > 0 ? (
              <Pressable
                onPress={() => router.push('/library')}
                accessibilityRole="button"
                className="shrink-0 rounded-full bg-primary-100 px-3 py-2 dark:bg-primary-900/50"
              >
                <Text
                  variant="caption"
                  className="font-semibold text-primary-700 dark:text-primary-300"
                >
                  See all
                </Text>
              </Pressable>
            ) : null}
            <View className="flex-row rounded-lg bg-neutral-200 p-1 dark:bg-neutral-800">
              {(['all', 'manga', 'novel'] as ReadingCategory[]).map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setReadingCategory(cat)}
                  className={cn(
                    'rounded-md px-2.5 py-1',
                    readingCategory === cat ? 'bg-primary-600' : 'bg-transparent',
                  )}
                >
                  <Text
                    className={cn(
                      'text-xs font-semibold capitalize',
                      readingCategory === cat
                        ? 'text-white'
                        : 'text-neutral-600 dark:text-neutral-400',
                    )}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* HorizontalSection with See All for Continue Reading */}
        {combinedReadingItems.length > 0 ? (
          <HorizontalSection title="">
            {combinedReadingItems.map((item) => (
              <View key={`${item.type}-${item.id}`} className="gap-1">
                <ContinueReadingCard
                  item={item}
                  onContinue={() =>
                    router.push(
                      item.type === 'manga'
                        ? mangaReadHref(item.id, item.chapterId, item.pageNumber as number)
                        : novelReadHref(item.id, item.chapterId, item.progress),
                    )
                  }
                  onPress={() => {
                    if (item.type === 'manga') router.push(mangaDetailsHref(item.id));
                    else router.push(novelDetailsHref(item.id));
                  }}
                />
                <Pressable
                  onPress={() => removeReadingItem(item.id, item.type)}
                  accessibilityRole="button"
                  accessibilityLabel="Remove from Continue Reading"
                  className="self-start rounded-full bg-neutral-200 px-2 py-0.5 dark:bg-neutral-800"
                >
                  <Text variant="caption" tone="muted" className="text-[10px]">
                    ✕ Remove
                  </Text>
                </Pressable>
              </View>
            ))}
          </HorizontalSection>
        ) : (
          <View className="mx-4 h-28 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-100/70 px-4 dark:border-neutral-800 dark:bg-neutral-900/60">
            <Text variant="caption" tone="muted" className="text-center">
              Nothing to continue reading yet
            </Text>
          </View>
        )}
      </View>

      <View className="flex-row flex-wrap items-center justify-between gap-3 px-4">
        <Text variant="caption" tone="muted">
          {loadingDiscovery ? 'Loading discovery…' : 'Discover from your enabled sources'}
        </Text>
        <Pressable
          accessibilityRole="button"
          className="rounded-full border border-primary-400 bg-primary-600 px-4 py-2"
          disabled={loadingDiscovery}
          onPress={() => setRefresh((value) => value + 1)}
        >
          <Text variant="caption" className="font-semibold text-white">
            Refresh
          </Text>
        </Pressable>
      </View>
      {discovery.map((section) => (
        <HorizontalSection key={section.id} title={section.title}>
          {section.items
            .filter((item) => enabled[item.providerId])
            .map((item) => (
              <ContentPosterCard
                key={item.id}
                title={item.title}
                coverUrl={item.coverUrl}
                type={item.type}
                routeId={item.id}
                episodeCount={item.episodeCount}
                chapterCount={item.chapterCount}
                sourceName={item.sourceName}
                status={item.status}
                alternativeTitles={item.alternativeTitles}
                onPress={() => {
                  if (item.type === 'anime') router.push(animeDetailsHref(item.id));
                  else if (item.type === 'novel') router.push(novelDetailsHref(item.id));
                  else router.push(mangaDetailsHref(item.id));
                }}
              />
            ))}
          {!section.items.some((item) => enabled[item.providerId]) && (
            <Text variant="caption" tone="muted" className="px-4">
              {loadingDiscovery
                ? 'Loading…'
                : section.unavailable
                  ? 'Source temporarily unavailable. Try refreshing later.'
                  : 'No items available from your enabled sources.'}
            </Text>
          )}
        </HorizontalSection>
      ))}
    </Screen>
  );
}
