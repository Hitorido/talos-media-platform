import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ProgressBar } from '@/components/home/ProgressBar';
import { Badge, Text } from '@/components/ui';
import { useDownloadStore } from '@/stores/downloadStore';
import type { AnimeEpisode } from '@/types/anime';
import { cn } from '@/utils/cn';

type EpisodeListItemProps = {
  episode: AnimeEpisode;
  animeId?: string;
  progress?: number;
  isActive?: boolean;
  onPress?: () => void;
  onDownloadPress?: () => void;
};

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min`;
}

export function EpisodeListItem({
  episode,
  animeId,
  progress,
  isActive,
  onPress,
  onDownloadPress,
}: EpisodeListItemProps) {
  const download = useDownloadStore((state) =>
    animeId ? state.getDownload(animeId, episode.id) : undefined,
  );

  const isDownloaded = download?.status === 'completed';
  const isDownloading = download?.status === 'downloading' || download?.status === 'queued';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900',
        isActive && 'border-primary-500 dark:border-primary-400',
      )}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Text variant="label">
              Episode {episode.number} · {formatDuration(episode.durationSeconds)}
            </Text>
            {isDownloaded ? (
              <Badge label="Offline" variant="secondary" />
            ) : null}

          </View>
          <Text variant="bodySmall" tone="muted" numberOfLines={2}>
            {episode.title}
          </Text>
        </View>

        <View className="flex-row items-center gap-3">
          {typeof progress === 'number' && progress > 0 ? (
            <Text variant="caption" tone="primary">
              {Math.round(progress * 100)}%
            </Text>
          ) : null}

          {onDownloadPress ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onDownloadPress();
              }}
              className="p-1.5"
              hitSlop={8}
            >
              {isDownloaded ? (
                <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              ) : isDownloading ? (
                <Ionicons name="hourglass-outline" size={22} color="#6366F1" />
              ) : (
                <Ionicons name="download-outline" size={22} color="#9CA3AF" />
              )}
            </Pressable>
          ) : null}
        </View>
      </View>

      {typeof progress === 'number' && progress > 0 ? (
        <ProgressBar progress={progress} className="mt-3" />
      ) : null}
    </Pressable>
  );
}

type EpisodeListProps = {
  animeId?: string;
  episodes: AnimeEpisode[];
  activeEpisodeId?: string;
  getEpisodeProgress?: (episodeId: string) => number | undefined;
  onEpisodePress: (episode: AnimeEpisode) => void;
  onDownloadEpisode?: (episode: AnimeEpisode) => void;
};

export function EpisodeList({
  animeId,
  episodes,
  activeEpisodeId,
  getEpisodeProgress,
  onEpisodePress,
  onDownloadEpisode,
}: EpisodeListProps) {
  return (
    <View className="gap-3">
      {episodes.map((episode) => (
        <EpisodeListItem
          key={episode.id}
          animeId={animeId}
          episode={episode}
          isActive={episode.id === activeEpisodeId}
          progress={getEpisodeProgress?.(episode.id)}
          onPress={() => onEpisodePress(episode)}
          onDownloadPress={onDownloadEpisode ? () => onDownloadEpisode(episode) : undefined}
        />
      ))}
    </View>
  );
}
