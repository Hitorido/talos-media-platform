import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { PopPressable as Pressable } from '@/components/ui/PopPressable';
import { Ionicons } from '@expo/vector-icons';

import { ProgressBar } from '@/components/home/ProgressBar';
import { Text } from '@/components/ui';
import { useDownloadStore } from '@/stores/downloadStore';
import type { AnimeEpisode } from '@/types/anime';
import { cn } from '@/utils/cn';

type EpisodeListItemProps = {
  episode: AnimeEpisode;
  animeId?: string;
  progress?: number;
  isActive?: boolean;
  isWatched?: boolean;
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
  isWatched,
  onPress,
  onDownloadPress,
}: EpisodeListItemProps) {
  const download = useDownloadStore((state) =>
    animeId ? state.getDownload(animeId, episode.id) : undefined,
  );

  const isDownloaded = download?.status === 'completed';
  const isDownloading = download?.status === 'downloading' || download?.status === 'queued';

  return (
    <View
      className={cn(
        'rounded-xl border border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900',
        isActive && 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-950',
        isWatched && !isActive && 'opacity-50',
      )}
    >
      <Pressable
        onPress={onPress}
        accessibilityLabel={`Episode ${episode.number}: ${episode.title}`}
        accessibilityState={{ selected: !!isActive }}
        className="items-center justify-center gap-1"
        style={{ minHeight: 62 }}
      >
        <Text variant="label" numberOfLines={1}>
          Ep. {episode.number}
        </Text>
        <Text
          variant="caption"
          tone="muted"
          numberOfLines={2}
          style={{ fontSize: 10, height: 28, textAlign: 'center' }}
        >
          {episode.title}
        </Text>
      </Pressable>
      <View className="flex-row items-center justify-between">
        <Text variant="caption" tone="muted" style={{ fontSize: 10 }}>
          {isDownloaded
            ? 'Saved'
            : progress
              ? `${Math.round(progress * 100)}%`
              : isWatched && !isActive
                ? '\u2713 Watched'
                : episode.durationSeconds > 0
                  ? formatDuration(episode.durationSeconds)
                  : ''}
        </Text>
        {onDownloadPress ? (
          <Pressable
            onPress={onDownloadPress}
            accessibilityLabel={
              isDownloaded ? 'Downloaded' : isDownloading ? 'Download queued' : 'Download episode'
            }
            style={{ minWidth: 28, minHeight: 28, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons
              name={
                isDownloaded
                  ? 'checkmark-circle'
                  : isDownloading
                    ? 'hourglass-outline'
                    : 'download-outline'
              }
              size={17}
              color="#818cf8"
            />
          </Pressable>
        ) : null}
      </View>
      {typeof progress === 'number' && progress > 0 ? (
        <ProgressBar progress={progress} className="mt-1" />
      ) : null}
    </View>
  );
}

type EpisodeListProps = {
  animeId?: string;
  episodes: AnimeEpisode[];
  activeEpisodeId?: string;
  getEpisodeProgress?: (episodeId: string) => number | undefined;
  isEpisodeWatched?: (episodeId: string) => boolean;
  onEpisodePress: (episode: AnimeEpisode) => void;
  onDownloadEpisode?: (episode: AnimeEpisode) => void;
};

export function EpisodeList({
  animeId,
  episodes,
  activeEpisodeId,
  getEpisodeProgress,
  isEpisodeWatched,
  onEpisodePress,
  onDownloadEpisode,
}: EpisodeListProps) {
  const [filter, setFilter] = useState<'all' | 'saved'>('all');
  const downloads = useDownloadStore((s) => s.items);
  const savedIds = useMemo(
    () =>
      new Set(
        Object.values(downloads)
          .filter((d) => d.mediaId === animeId && d.status === 'completed')
          .map((d) => d.unitId),
      ),
    [downloads, animeId],
  );
  const visible = episodes.filter((ep) => filter === 'all' || savedIds.has(ep.id));
  return (
    <View className="gap-3">
      <View className="flex-row gap-2">
        {(['all', 'saved'] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setFilter(value)}
            className={cn(
              'rounded-full px-3 py-2',
              filter === value ? 'bg-primary-600' : 'bg-neutral-200 dark:bg-neutral-800',
            )}
          >
            <Text variant="caption" style={filter === value ? { color: '#fff' } : undefined}>
              {value === 'all' ? 'All' : 'Saved'}
            </Text>
          </Pressable>
        ))}
      </View>
      {!visible.length ? (
        <Text tone="muted">No episodes in this range match the filter.</Text>
      ) : null}
      <View className="flex-row flex-wrap" style={{ gap: 6 }}>
        {visible.map((episode) => (
          <View key={episode.id} style={{ width: '23.5%' }}>
            <EpisodeListItem
              animeId={animeId}
              episode={episode}
              isActive={episode.id === activeEpisodeId}
              isWatched={isEpisodeWatched?.(episode.id)}
              progress={getEpisodeProgress?.(episode.id)}
              onPress={() => onEpisodePress(episode)}
              onDownloadPress={onDownloadEpisode ? () => onDownloadEpisode(episode) : undefined}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
