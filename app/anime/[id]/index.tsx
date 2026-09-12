import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
      <AnimeDetailsHeader anime={anime} />

      {isProviderContent ? (
        <View className="rounded-xl border border-primary-500/30 bg-primary-500/10 px-3 py-2">
          <Text variant="caption" className="text-primary-600 dark:text-primary-400">
            Loaded from a metadata provider. Playback uses a separate streaming resolver
            (demo catalog or a configured Consumet endpoint). Metadata alone cannot stream.
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
        <View className="flex-row items-center justify-between">
          <Text variant="h3">Episodes ({anime.episodes.length})</Text>
          {!isProviderContent ? (
            <Pressable
              onPress={() => setBulkModalOpen(true)}
              className="flex-row items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 dark:bg-primary-950"
            >
              <Ionicons name="cloud-download-outline" size={16} color="#6366f1" />
              <Text className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                Download All
              </Text>
            </Pressable>
          ) : null}
        </View>
        <EpisodeList
          animeId={anime.id}
          episodes={anime.episodes}
          activeEpisodeId={latestProgress?.episodeId}
          getEpisodeProgress={getEpisodeProgress}
          onEpisodePress={(episode) => openEpisode(episode.id)}
          onDownloadEpisode={
            isProviderContent ? undefined : (episode) => downloadAnimeEpisode(anime, episode)
          }
        />
      </View>

      {!isProviderContent ? (
        <BulkDownloadModal
          visible={bulkModalOpen}
          target={anime ? { kind: 'anime', anime, episodes: anime.episodes } : null}
          onClose={() => setBulkModalOpen(false)}
        />
      ) : null}
    </Screen>
  );
}
