import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import {
    ContentPosterCard,
    ContinueReadingCard,
    ContinueWatchingCard,
    HomeHeader,
    HorizontalSection,
} from '@/components/home';
import { NovelLanguageFilter } from '@/components/search/NovelLanguageFilter';
import { useNovelPreferencesStore } from '@/stores/novelPreferencesStore';
import { Screen, Text } from '@/components/ui';
import { animeDetailsHref, mangaDetailsHref, novelDetailsHref } from '@/lib/routes';
import { emptyDiscovery, getDiscovery } from '@/services/discoveryService';
import { useProviderStore } from '@/stores/providerStore';
import { useContinueWatching } from '@/stores/animeProgressStore';
import { useContinueReading } from '@/stores/mangaProgressStore';
import { useContinueReadingNovels } from '@/stores/novelProgressStore';
import { cn } from '@/utils/cn';

type ReadingCategory = 'all' | 'manga' | 'novel';

export default function HomeScreen() {
  const router = useRouter();
  const continueWatching = useContinueWatching();
  const continueReadingManga = useContinueReading();
  const continueReadingNovels = useContinueReadingNovels();
  const [readingCategory, setReadingCategory] = useState<ReadingCategory>('all');

  const novelLanguage = useNovelPreferencesStore(state => state.language);
  const enabled = useProviderStore(state => state.enabled);
  const [discovery, setDiscovery] = useState(emptyDiscovery);
  const [loadingDiscovery, setLoadingDiscovery] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoadingDiscovery(true);
    getDiscovery(enabled, refresh > 0, novelLanguage).then(result => {
      if (active) setDiscovery(result);
    }).catch(() => {
      if (active) setDiscovery(emptyDiscovery().map(section => ({...section, unavailable: true})));
    }).finally(() => { if (active) setLoadingDiscovery(false); });
    return () => { active = false; };
  }, [enabled, refresh, novelLanguage]);

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

  return (
    <Screen scrollable contentContainerClassName="gap-8 pb-8">
      <HomeHeader />
      <NovelLanguageFilter />

      <HorizontalSection title="Continue Watching">
        {continueWatching.map((item) => (
          <ContinueWatchingCard
            key={item.animeId}
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
            onPress={() => router.push(animeDetailsHref(item.animeId))}
          />
        ))}
      </HorizontalSection>

      <View className="gap-3">
        <View className="flex-row items-center justify-between px-4">
          <Text variant="h2">Continue Reading</Text>
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

        <HorizontalSection title="">
          {combinedReadingItems.map((item) => (
            <ContinueReadingCard
              key={`${item.type}-${item.id}`}
              item={item}
              onPress={() => {
                if (item.type === 'manga') router.push(mangaDetailsHref(item.id));
                else router.push(novelDetailsHref(item.id));
              }}
            />
          ))}
        </HorizontalSection>
      </View>

      <View className="flex-row items-center justify-between px-4">
        <Text variant="caption" tone="muted">{loadingDiscovery ? 'Loading discovery?' : 'Discover from your enabled sources'}</Text>
        <Pressable accessibilityRole="button" disabled={loadingDiscovery} onPress={() => setRefresh(value => value + 1)}>
          <Text variant="caption">Refresh</Text>
        </Pressable>
      </View>
      {discovery.map(section => (
        <HorizontalSection key={section.id} title={section.title}>
          {section.items.filter(item => enabled[item.providerId]).map(item => (
            <ContentPosterCard key={item.id} title={item.title} coverUrl={item.coverUrl} type={item.type}
              subtitle={item.sourceName + ' ? ' + item.signal}
              onPress={() => {
                if (item.type === 'anime') router.push(animeDetailsHref(item.id));
                else if (item.type === 'novel') router.push(novelDetailsHref(item.id));
                else router.push(mangaDetailsHref(item.id));
              }} />
          ))}
          {!section.items.some(item => enabled[item.providerId]) && (
            <Text variant="caption" tone="muted" className="px-4">
              {loadingDiscovery ? 'Loading?' : section.unavailable ? 'Source temporarily unavailable. Try refreshing later.' : 'No items available from your enabled sources.'}
            </Text>
          )}
        </HorizontalSection>
      ))}
    </Screen>
  );
}
