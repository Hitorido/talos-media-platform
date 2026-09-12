import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import {
    ContentPosterCard,
    ContinueReadingCard,
    ContinueWatchingCard,
    HomeHeader,
    HorizontalSection,
    RecentlyUpdatedCard,
    RecommendationCard,
} from '@/components/home';
import { Screen, Text } from '@/components/ui';
import { animeDetailsHref, mangaDetailsHref, novelDetailsHref } from '@/lib/routes';
import { homeFeedData } from '@/services/mock/homeData';
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

  const { trendingAnime, trendingManga, trendingNovels, recentlyUpdated, recommendations } =
    homeFeedData;

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

      <HorizontalSection title="Trending Anime">
        {trendingAnime.map((item) => (
          <ContentPosterCard
            key={item.id}
            title={item.title}
            coverUrl={item.coverUrl}
            type={item.type}
            subtitle={`#${item.rank} · ★ ${item.rating.toFixed(1)}`}
            onPress={() => router.push(animeDetailsHref(item.id))}
          />
        ))}
      </HorizontalSection>

      <HorizontalSection title="Trending Manga">
        {trendingManga.map((item) => (
          <ContentPosterCard
            key={item.id}
            title={item.title}
            coverUrl={item.coverUrl}
            type={item.type}
            subtitle={`#${item.rank} · ★ ${item.rating.toFixed(1)}`}
            onPress={() => router.push(mangaDetailsHref(item.id))}
          />
        ))}
      </HorizontalSection>

      <HorizontalSection title="Trending Novels">
        {trendingNovels.map((item) => (
          <ContentPosterCard
            key={item.id}
            title={item.title}
            coverUrl={item.coverUrl}
            type={item.type}
            subtitle={`#${item.rank} · ★ ${item.rating.toFixed(1)}`}
            onPress={() => router.push(novelDetailsHref(item.id))}
          />
        ))}
      </HorizontalSection>

      <HorizontalSection title="Recently Updated">
        {recentlyUpdated.map((item) => (
          <RecentlyUpdatedCard
            key={item.id}
            item={item}
            onPress={() => {
              if (item.type === 'anime') router.push(animeDetailsHref(item.id));
              else if (item.type === 'manga') router.push(mangaDetailsHref(item.id));
              else if (item.type === 'novel') router.push(novelDetailsHref(item.id));
            }}
          />
        ))}
      </HorizontalSection>

      <HorizontalSection title="Recommendations">
        {recommendations.map((item) => (
          <RecommendationCard
            key={item.id}
            item={item}
            onPress={() => {
              if (item.type === 'anime') router.push(animeDetailsHref(item.id));
              else if (item.type === 'manga') router.push(mangaDetailsHref(item.id));
              else if (item.type === 'novel') router.push(novelDetailsHref(item.id));
            }}
          />
        ))}
      </HorizontalSection>
    </Screen>
  );
}
