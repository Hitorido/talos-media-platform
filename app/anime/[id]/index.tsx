import { MediaBookmarks } from '@/components/content/MediaBookmarks';
import { ChapterRangePicker, chapterRange } from '@/components/content/SelectionModal';
import { SourceWebsiteButton } from '@/components/content/SourceWebsiteButton';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AnimeDetailsHeader, EpisodeList } from '@/components/anime';
import { BulkDownloadModal } from '@/components/downloads';
import { Button, Screen, Text } from '@/components/ui';
import { useAnimeContent } from '@/hooks/useAnimeContent';
import { animeWatchHref } from '@/lib/routes';
import { downloadAnimeEpisode } from '@/services/downloadService';
import { useAnimeProgressStore } from '@/stores/animeProgressStore';

export default function AnimeDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { anime, loading, error, isProviderContent } = useAnimeContent(id);
  const latestProgress = useAnimeProgressStore((state) =>
    anime ? state.getLatestProgress(anime.id) : undefined,
  );
  const [range, setRange] = useState(0);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  if (loading) {
    return (
      <Screen contentContainerClassName="flex-grow items-center justify-center gap-3">
        <ActivityIndicator size="large" />
        <Text tone="muted">Loading anime details...</Text>
      </Screen>
    );
  }

  if (!anime || error) {
    return (
      <Screen scrollable contentContainerClassName="flex-grow justify-center gap-4">
        <Text variant="h2">Anime not found</Text>
        {error ? <Text tone="muted">{error}</Text> : null}
        <SourceWebsiteButton routeId={id} />
        <Button label="Go back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const continueEpisode =
    anime.episodes.find((episode) => episode.id === latestProgress?.episodeId) ?? anime.episodes[0];

  const getEpisodeProgress = (episodeId: string) => {
    if (!latestProgress || latestProgress.episodeId !== episodeId) {
      return undefined;
    }

    return latestProgress.durationSeconds > 0
      ? latestProgress.positionSeconds / latestProgress.durationSeconds
      : undefined;
  };

  const openEpisode = (episodeId: string) => {
    router.push(animeWatchHref(anime.id, episodeId));
  };

  return (
    <Screen scrollable contentContainerClassName="gap-6 pb-8">
      <Stack.Screen options={{ title: anime.title }} />
      <AnimeDetailsHeader anime={anime} />

      {isProviderContent ? (
        <View className="rounded-xl border border-primary-500/30 bg-primary-500/10 px-3 py-2">
          <Text variant="caption" className="text-primary-600 dark:text-primary-400">
            Loaded from a metadata provider. Playback uses a separate streaming resolver (demo
            catalog or a configured playback source). Metadata alone cannot stream.
          </Text>
        </View>
      ) : (
        <View className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <Text variant="caption" className="text-amber-700 dark:text-amber-300">
            Demo catalog title. Playback uses legal sample videos labeled as Demo Stream — not
            licensed anime.
          </Text>
        </View>
      )}

      {continueEpisode ? (
        <Button
          label={
            latestProgress
              ? `Continue Episode ${latestProgress.episodeNumber}`
              : `Play Episode ${continueEpisode.number}`
          }
          onPress={() => openEpisode(continueEpisode.id)}
        />
      ) : null}

      <View className="gap-3">
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <Text variant="h3">Episodes ({anime.episodes.length})</Text>
          <ChapterRangePicker count={anime.episodes.length} value={range} onChange={setRange} />
          <Pressable
            onPress={() => setBulkModalOpen(true)}
            className="flex-row items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 dark:bg-primary-950"
          >
            <Ionicons name="cloud-download-outline" size={16} color="#6366f1" />
            <Text className="text-xs font-semibold text-primary-600 dark:text-primary-400">
              Download All
            </Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowBookmarks((value) => !value)}
          className="self-start rounded-full bg-primary-100 px-4 py-2 dark:bg-primary-950"
        >
          <Text tone="primary">{showBookmarks ? 'Show episodes' : 'Bookmarks'}</Text>
        </Pressable>
        {showBookmarks ? (
          <MediaBookmarks mediaId={anime.id} kind="anime" coverUrl={anime.coverUrl} />
        ) : (
          <EpisodeList
            animeId={anime.id}
            episodes={chapterRange(anime.episodes, range)}
            activeEpisodeId={latestProgress?.episodeId}
            getEpisodeProgress={getEpisodeProgress}
            onEpisodePress={(episode) => openEpisode(episode.id)}
            onDownloadEpisode={(episode) => downloadAnimeEpisode(anime, episode)}
          />
        )}
      </View>

      <BulkDownloadModal
        visible={bulkModalOpen}
        target={anime ? { kind: 'anime', anime, episodes: anime.episodes } : null}
        onClose={() => setBulkModalOpen(false)}
      />
    </Screen>
  );
}
