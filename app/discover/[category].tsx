import { useEffect, useMemo, useState } from 'react';
import { Image, TextInput, View, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Button, Screen, Text } from '@/components/ui';
import { PopPressable } from '@/components/ui/PopPressable';
import { CategoryHighlight, type BrowseItem } from '@/components/content/CategoryHighlight';
import { GenreFilters } from '@/components/content/GenreFilters';
import {
  DiscoveryMenu,
  discoveryCategories,
  categoryName,
} from '@/components/navigation/DiscoveryMenu';
import { getDiscovery } from '@/services/discoveryService';
import { unifiedSearch } from '@/services/contentService';
import type { SearchFilter } from '@/types/search';
import { useProviderStore } from '@/stores/providerStore';
import { apiRequestWithWake } from '@/services/api/client';
import { animeDetailsHref, mangaDetailsHref, novelDetailsHref } from '@/lib/routes';
type Section = { id: string; title: string; items: BrowseItem[] };
export default function CategoryDiscovery() {
  const { category = 'anime' } = useLocalSearchParams<{ category: string }>();
  return <CategoryPage key={category} category={category} />;
}
function CategoryPage({ category }: { category: string }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const enabled = useProviderStore((s) => s.enabled);
  const [query, setQuery] = useState('');
  const [term, setTerm] = useState('');
  const [genre, setGenre] = useState('All genres');
  const [feed, setFeed] = useState('trending');
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState<{ key: string; sections: Section[]; error?: string } | null>(
    null,
  );
  const catalog = category === 'movies' || category === 'tv';
  const valid = discoveryCategories.some((x) => x === category);
  const key = `${category}:${term}:${feed}:${refresh}`;
  useEffect(() => {
    const timer = setTimeout(() => setTerm(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (!valid) return;
    let active = true;
    const controller = new AbortController();
    const load = async (): Promise<Section[]> => {
      if (catalog) {
        const data = await apiRequestWithWake<{ items: BrowseItem[] }>(
          `/api/content/catalog/${category}?feed=${feed}&q=${encodeURIComponent(term)}`,
        );
        return [
          {
            id: feed,
            title: term
              ? 'Search results'
              : feed === 'top_rated'
                ? 'Top rated'
                : feed === 'popular'
                  ? 'Popular'
                  : 'Trending this week',
            items: data.items,
          },
        ];
      }
      if (term) {
        const data = await unifiedSearch(term, category as SearchFilter, {
          signal: controller.signal,
        });
        return [
          {
            id: 'search',
            title: 'Search results',
            items: data.results.map((x) => ({ ...x, genres: x.tags })),
          },
        ];
      }
      return (await getDiscovery(enabled, refresh > 0, 'en'))
        .map((section) => ({
          ...section,
          items: section.items.filter((item) =>
            category === 'anime' || category === 'novel'
              ? item.type === category
              : item.type === 'manga' && (item.comicFormat || 'manga') === category,
          ),
        }))
        .filter((section) => section.items.length);
    };
    load()
      .then((sections) => {
        if (active) setState({ key, sections });
      })
      .catch((e) => {
        if (active)
          setState({ key, sections: [], error: e instanceof Error ? e.message : 'Unavailable' });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [valid, catalog, category, term, feed, refresh, key, enabled]);
  const sections = useMemo(() => (state?.key === key ? state.sections : []), [state, key]);
  const all = useMemo(
    () => [...new Map(sections.flatMap((s) => s.items).map((x) => [x.id, x])).values()],
    [sections],
  );
  const genres = [...new Set(all.flatMap((x) => x.genres || []))].sort();
  const selectedGenre = genres.includes(genre) ? genre : 'All genres';
  const open = (item: BrowseItem) =>
    router.push(
      catalog
        ? (`/playback?mediaType=${category === 'tv' ? 'tv' : 'movie'}&tmdbId=${encodeURIComponent(item.id)}&normalizedTitle=${encodeURIComponent(item.title)}` as Href)
        : item.type === 'anime'
          ? animeDetailsHref(item.id)
          : item.type === 'novel'
            ? novelDetailsHref(item.id)
            : mangaDetailsHref(item.id),
    );
  const columns = Math.max(3, Math.min(7, Math.floor((Math.min(width, 1280) - 64) / 150)));
  return (
    <Screen scrollable>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="gap-4 p-2">
        <View className="flex-row items-center justify-between">
          <Button label="Back" variant="secondary" onPress={() => router.back()} />
          <DiscoveryMenu />
        </View>
        <View className="flex-row items-center justify-between">
          <Text variant="h1">{categoryName(category)}</Text>
          <Button label="Refresh" size="sm" onPress={() => setRefresh((x) => x + 1)} />
        </View>
        <TextInput
          accessibilityLabel={`Search ${categoryName(category)}`}
          placeholder={`Search ${categoryName(category)}`}
          placeholderTextColor="#888"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => setTerm(query.trim())}
          className="rounded-xl border border-neutral-300 p-3 text-neutral-900 dark:border-neutral-700 dark:text-white"
        />
        {catalog ? (
          <View className="flex-row gap-2">
            {['trending', 'popular', 'top_rated'].map((value) => (
              <Button
                key={value}
                label={
                  value === 'top_rated' ? 'Top rated' : value === 'popular' ? 'Popular' : 'Trending'
                }
                size="sm"
                variant={feed === value ? 'primary' : 'secondary'}
                onPress={() => setFeed(value)}
              />
            ))}
          </View>
        ) : null}
        <GenreFilters genres={genres} value={selectedGenre} onChange={setGenre} />
        {!term ? <CategoryHighlight items={all} category={category} onOpen={open} /> : null}
        {!valid ? (
          <Text>Unknown category.</Text>
        ) : state?.key !== key ? (
          <Text>Loading titles...</Text>
        ) : state.error ? (
          <Text>{state.error}</Text>
        ) : null}
        {sections.map((section) => {
          const items = section.items.filter(
            (x) => selectedGenre === 'All genres' || x.genres?.includes(selectedGenre),
          );
          return (
            <View key={section.id} className="gap-3">
              <Text variant="h2">{section.title}</Text>
              {!items.length ? (
                <Text tone="muted">No titles match this genre in this feed.</Text>
              ) : (
                <View className="flex-row flex-wrap">
                  {items.map((item) => (
                    <View key={item.id} style={{ width: `${100 / columns}%`, padding: 4 }}>
                      <PopPressable
                        onPress={() => open(item)}
                        className="gap-2 rounded-xl border border-neutral-200 bg-neutral-100 p-2 dark:border-neutral-800 dark:bg-neutral-900"
                      >
                        {item.coverUrl ? (
                          <Image
                            source={{ uri: item.coverUrl }}
                            style={{ width: '100%', aspectRatio: 2 / 3, borderRadius: 8 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={{ aspectRatio: 2 / 3 }} />
                        )}
                        <Text
                          numberOfLines={2}
                          style={{ height: 38, fontSize: 13, lineHeight: 19 }}
                        >
                          {item.title}
                        </Text>
                        <Text numberOfLines={1} variant="caption" tone="muted">
                          {item.sourceName || categoryName(category)}
                        </Text>
                      </PopPressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
        {state?.key === key && !state.error && !all.length ? (
          <Text>No titles available from the enabled sources.</Text>
        ) : null}
        {catalog ? (
          <Text variant="caption" tone="muted">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
export function generateStaticParams() {
  return discoveryCategories.map((category) => ({ category }));
}
