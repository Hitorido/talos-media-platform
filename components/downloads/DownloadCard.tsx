import { Image, View } from 'react-native';

import { ProgressBar } from '@/components/home/ProgressBar';
import { Badge, Button, Text } from '@/components/ui';
import type { DownloadItem } from '@/types/download';

type DownloadCardProps = {
  item: DownloadItem;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onOpen: () => void;
};

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(1)} ${units[i]}`;
}

function getStatusBadge(status: DownloadItem['status']) {
  switch (status) {
    case 'downloading':
      return <Badge label="Downloading" variant="primary" />;
    case 'queued':
      return <Badge label="Queued" variant="secondary" />;
    case 'paused':
      return <Badge label="Paused" variant="default" />;
    case 'completed':
      return <Badge label="Downloaded" variant="success" />;
    case 'failed':
      return <Badge label="Failed" className="bg-red-100 dark:bg-red-950" />;
    case 'cancelled':
      return <Badge label="Cancelled" variant="default" />;
    default:
      return <Badge label={status} variant="default" />;
  }
}

export function DownloadCard({
  item,
  onPause,
  onResume,
  onRetry,
  onCancel,
  onDelete,
  onOpen,
}: DownloadCardProps) {
  const isDownloading = item.status === 'downloading';
  const isQueued = item.status === 'queued';
  const isPaused = item.status === 'paused';
  const isCompleted = item.status === 'completed';
  const isFailed = item.status === 'failed';

  const progressPercent = Math.round(item.progress * 100);

  return (
    <View className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <View className="flex-row gap-3">
        {/* Cover thumbnail */}
        <View className="h-20 w-14 overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
          {item.coverUrl ? (
            <Image source={item.coverUrl?.trim() ? { uri: item.coverUrl } : undefined} className="h-full w-full" resizeMode="cover" />
          ) : null}
        </View>

        {/* Content Info */}
        <View className="flex-1 justify-between">
          <View className="gap-1">
            <View className="flex-row items-center justify-between gap-2">
              <Text variant="label" numberOfLines={1} className="flex-1">
                {item.mediaTitle}
              </Text>
              {getStatusBadge(item.status)}
            </View>

            <Text variant="bodySmall" tone="muted" numberOfLines={1}>
              {item.unitTitle}
            </Text>

            <View className="flex-row items-center gap-2">
              <Badge
                label={item.mediaType.toUpperCase()}
                variant={
                  item.mediaType === 'anime'
                    ? 'anime'
                    : item.mediaType === 'novel'
                      ? 'novel'
                      : 'manga'
                }
              />
              {item.totalBytes > 0 ? (
                <Text variant="caption" tone="muted">
                  {formatBytes(item.bytesDownloaded)} / {formatBytes(item.totalBytes)}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      {/* Progress row for active / paused states */}
      {(isDownloading || isPaused || isQueued) && (
        <View className="mt-3 gap-1.5">
          <View className="flex-row items-center justify-between">
            <Text variant="caption" tone="muted">
              {isDownloading ? 'Downloading...' : isPaused ? 'Paused' : 'Waiting in queue...'}
            </Text>
            <Text variant="caption" tone="primary" className="font-semibold">
              {progressPercent}%
            </Text>
          </View>
          <ProgressBar progress={item.progress} />
        </View>
      )}

      {/* Error message */}
      {isFailed && item.error ? (
        <View className="mt-2 rounded-lg bg-red-500/10 p-2">
          <Text variant="caption" className="text-red-500">
            {item.error}
          </Text>
        </View>
      ) : null}

      {/* Action Buttons */}
      <View className="mt-3 flex-row items-center justify-end gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800/80">
        {isDownloading ? (
          <>
            <Button label="Pause" size="sm" variant="secondary" onPress={onPause} />
            <Button label="Cancel" size="sm" variant="ghost" onPress={onCancel} />
          </>
        ) : null}

        {isPaused ? (
          <>
            <Button label="Resume" size="sm" variant="primary" onPress={onResume} />
            <Button label="Cancel" size="sm" variant="ghost" onPress={onCancel} />
          </>
        ) : null}

        {isQueued ? <Button label="Cancel" size="sm" variant="ghost" onPress={onCancel} /> : null}

        {isFailed ? (
          <>
            <Button label="Retry" size="sm" variant="primary" onPress={onRetry} />
            <Button label="Delete" size="sm" variant="ghost" onPress={onDelete} />
          </>
        ) : null}

        {isCompleted ? (
          <>
            <Button
              label={item.mediaType === 'anime' ? 'Play Offline' : 'Read Offline'}
              size="sm"
              variant="primary"
              onPress={onOpen}
            />
            <Button label="Delete" size="sm" variant="ghost" onPress={onDelete} />
          </>
        ) : null}
      </View>
    </View>
  );
}
