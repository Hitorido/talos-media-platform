import { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Screen, Text } from '@/components/ui';
import { ContentPosterCard, HorizontalSection } from '@/components/home';
import {
  DiscoveryMenu,
  discoveryCategories,
  categoryName,
} from '@/components/navigation/DiscoveryMenu';
import { getDiscovery, type DiscoverySection } from '@/services/discoveryService';
import { useProviderStore } from '@/stores/providerStore';
import { apiRequestWithWake } from '@/services/api/client';
import { animeDetailsHref, mangaDetailsHref, novelDetailsHref } from '@/lib/routes';
type CatalogItem = {
  id: string;
  title: string;
  overview: string;
  coverUrl: string;
  website: string;
};
export default function CategoryDiscovery() {
  const { category = 'anime' } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const enabled = useProviderStore((s) => s.enabled);
  const [state, setState] = useState<{
    key: string;
    sections: DiscoverySection[];
    catalog: CatalogItem[];
    error?: string;
  } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const key = category + ':' + refresh;
  const valid = discoveryCategories.some((value) => value === category);
  const catalogOnly = category === 'movies' || category === 'tv';
  useEffect(() => {
    if (!valid) return;
    let active = true;
    const load = async () => {
      if (catalogOnly) {
        const result = await apiRequestWithWake<{ items: CatalogItem[] }>(
          '/api/content/catalog/' + category,
        );
        return { key, sections: [], catalog: result.items };
      }
      const feeds = await getDiscovery(enabled, refresh > 0, 'en');
      const sections = feeds
        .map((section) => ({
          ...section,
          items: section.items.filter((item) =>
            category === 'anime' || category === 'novel'
              ? item.type === category
              : item.type === 'manga' && (item.comicFormat || 'manga') === category,
          ),
        }))
        .filter((section) => section.items.length);
      return { key, sections, catalog: [] };
    };
    load()
      .then((result) => {
        if (active) setState(result);
      })
      .catch((error) => {
        if (active)
          setState({
            key,
            sections: [],
            catalog: [],
            error: error instanceof Error ? error.message : 'Catalog unavailable.',
          });
      });
    return () => {
      active = false;
    };
  }, [category, catalogOnly, enabled, refresh, key, valid]);
  return (
    <Screen scrollable>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="gap-5 p-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()}>
            <Text tone="primary">Back</Text>
          </Pressable>
          <DiscoveryMenu />
        </View>
        <View className="flex-row items-center justify-between">
          <Text variant="h1">{categoryName(category)}</Text>
          <Pressable
            className="rounded-xl bg-primary-600 px-4 py-2"
            onPress={() => setRefresh((x) => x + 1)}
          >
            <Text style={{ color: 'white' }}>Refresh</Text>
          </Pressable>
        </View>
        {!valid ? (
          <Text>Unknown category.</Text>
        ) : state?.key !== key ? (
          <Text>Loading titles...</Text>
        ) : (
          <>
            {state.error ? <Text tone="muted">{state.error}</Text> : null}
            {state.sections.map((section) => (
              <HorizontalSection key={section.id} title={section.title}>
                {section.items.map((item) => (
                  <ContentPosterCard
                    key={item.id}
                    title={item.title}
                    coverUrl={item.coverUrl}
                    type={item.type}
                    routeId={item.id}
                    sourceName={item.sourceName}
                    onPress={() =>
                      router.push(
                        item.type === 'anime'
                          ? animeDetailsHref(item.id)
                          : item.type === 'novel'
                            ? novelDetailsHref(item.id)
                            : mangaDetailsHref(item.id),
                      )
                    }
                  />
                ))}
              </HorizontalSection>
            ))}
            {!catalogOnly && !state.sections.length && !state.error ? (
              <Text tone="muted">
                No discovery titles available from your enabled sources. Try Search or refresh
                later.
              </Text>
            ) : null}
            {catalogOnly ? (
              <Text tone="muted">Playback requires a configured private CinePro service.</Text>
            ) : null}
            {state.catalog.map((item) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  router.push(
                    `/playback?mediaType=${category === 'tv' ? 'tv' : 'movie'}&tmdbId=${encodeURIComponent(item.id)}&normalizedTitle=${encodeURIComponent(item.title)}` as Href,
                  )
                }
                className="flex-row gap-4 rounded-xl bg-neutral-100 p-3 dark:bg-neutral-900"
              >
                {item.coverUrl ? (
                  <Image
                    source={{ uri: item.coverUrl }}
                    style={{ width: 90, height: 135, borderRadius: 8 }}
                  />
                ) : null}
                <View className="flex-1 gap-2">
                  <Text variant="h3">{item.title}</Text>
                  <Text numberOfLines={4}>{item.overview}</Text>
                  <Text tone="primary">Open playback</Text>
                </View>
              </Pressable>
            ))}
            {catalogOnly ? (
              <Text variant="caption" tone="muted">
                Movie and TV metadata: TMDB. This product uses the TMDB API but is not endorsed or
                certified by TMDB.
              </Text>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

export function generateStaticParams() {
  return discoveryCategories.map((category) => ({ category }));
}
