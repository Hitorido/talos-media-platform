import { groupDownloads } from '@/services/downloadGroups';
import { DownloadTitleCard } from '@/components/downloads/DownloadTitleCard';
import { appAlert as Alert } from '@/stores/dialogStore';
import { useHiddenPrivateIds } from '@/hooks/useHiddenPrivateIds';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { DownloadCard, DownloadSectionTabs } from '@/components/downloads';
import { Button, Screen, SwipeableRow, Text } from '@/components/ui';
import { animeWatchHref, mangaReadHref, novelReadHref } from '@/lib/routes';
import {
  cancelDownload,
  clearCompletedDownloads,
  deleteDownload,
  pauseDownload,
  resumeDownload,
  retryDownload,
} from '@/services/downloadService';
import { useDownloadStore } from '@/stores/downloadStore';
import type { DownloadItem, DownloadSectionTab } from '@/types/download';

function formatTotalSize(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1000) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export default function DownloadsScreen() {
  const router = useRouter();
  const itemsMap = useDownloadStore((state) => state.items);
  const hidden = useHiddenPrivateIds();
  const items = useMemo(
    () => Object.values(itemsMap).filter((item) => !hidden.has(item.mediaId)),
    [itemsMap, hidden],
  );

  const [activeTab, setActiveTab] = useState<DownloadSectionTab>('all');

  const counts: Record<DownloadSectionTab, number> = useMemo(() => {
    return {
      all: items.length,
      active: items.filter((i) => i.status === 'downloading' || i.status === 'paused').length,
      queued: items.filter((i) => i.status === 'queued').length,
      completed: items.filter((i) => i.status === 'completed').length,
      failed: items.filter((i) => i.status === 'failed').length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (activeTab === 'all') return true;
        if (activeTab === 'active')
          return item.status === 'downloading' || item.status === 'paused';
        if (activeTab === 'queued') return item.status === 'queued';
        if (activeTab === 'completed') return item.status === 'completed';
        if (activeTab === 'failed') return item.status === 'failed';
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
  }, [items, activeTab]);

  const totalDownloadedBytes = useMemo(() => {
    return items
      .filter((i) => i.status === 'completed')
      .reduce((sum, i) => sum + (i.bytesDownloaded || 0), 0);
  }, [items]);

  const groupedItems = useMemo(() => groupDownloads(filteredItems), [filteredItems]);

  const handleOpenItem = (item: DownloadItem) => {
    if (item.mediaType === 'anime') {
      router.push(animeWatchHref(item.mediaId, item.unitId));
    } else if (
      item.mediaType === 'manga' ||
      item.mediaType === 'manhwa' ||
      item.mediaType === 'manhua'
    ) {
      router.push(mangaReadHref(item.mediaId, item.unitId));
    } else if (item.mediaType === 'novel') {
      router.push(novelReadHref(item.mediaId, item.unitId));
    }
  };

  const handleDismissItem = (item: DownloadItem) => {
    void deleteDownload(item.id);
  };

  const handleDeleteAll = () => {
    Alert.alert('Delete all downloads?', 'This removes every downloaded episode and chapter.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete all',
        style: 'destructive',
        onPress: () => void Promise.all(items.map((item) => deleteDownload(item.id))),
      },
    ]);
  };

  const handleRetryFailed = () => {
    for (const item of items) {
      if (item.status === 'failed' || item.status === 'cancelled') retryDownload(item.id);
    }
  };

  return (
    <Screen scrollable contentContainerClassName="gap-5 pb-8">
      {/* Header & Storage Info */}
      <View className="gap-2 px-4 pt-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text variant="h1" numberOfLines={1}>
              Downloads
            </Text>
            <Text tone="muted">Manage your offline media and queues.</Text>
          </View>
        </View>

        {/* Storage stats banner */}
        <View className="flex-row items-center justify-between rounded-xl bg-neutral-100 p-3 dark:bg-neutral-900">
          <View className="gap-0.5">
            <Text variant="caption" tone="muted">
              Offline Storage Used
            </Text>
            <Text variant="label">{formatTotalSize(totalDownloadedBytes)}</Text>
          </View>
          <View className="items-end gap-0.5">
            <Text variant="caption" tone="muted">
              Downloaded Titles
            </Text>
            <Text variant="label" numberOfLines={1} adjustsFontSizeToFit>
              {
                new Set(
                  items.filter((item) => item.status === 'completed').map((item) => item.mediaId),
                ).size
              }{' '}
              titles
            </Text>
          </View>
        </View>
        <View className="flex-row flex-wrap items-center gap-2">
          {counts.failed > 0 ? (
            <Button
              label="Retry failed"
              variant="secondary"
              size="sm"
              onPress={handleRetryFailed}
            />
          ) : null}
          {counts.completed > 0 ? (
            <Button
              label="Clear completed"
              variant="secondary"
              size="sm"
              onPress={() => void clearCompletedDownloads()}
            />
          ) : null}
          {items.length > 0 ? (
            <Button label="Delete all" variant="destructive" size="sm" onPress={handleDeleteAll} />
          ) : null}
        </View>
      </View>

      {/* Tabs */}
      <DownloadSectionTabs activeTab={activeTab} counts={counts} onSelectTab={setActiveTab} />

      {/* Swipe hint */}
      {groupedItems.length > 0 ? (
        <View className="px-4">
          <Text variant="caption" tone="muted" className="text-center">
            Swipe right on a title to remove it
          </Text>
        </View>
      ) : null}

      {/* Download Items List */}
      <View className="gap-3 px-4">
        {groupedItems.length > 0 ? (
          groupedItems.map((group) => (
            <SwipeableRow
              key={group.key}
              onSwipeRight={() =>
                void Promise.all(group.items.map((item) => deleteDownload(item.id)))
              }
              actionLabel="Delete title"
              actionIcon="trash-outline"
            >
              <DownloadTitleCard group={group}>
                {group.items.map((item) => (
                  <DownloadCard
                    key={item.id}
                    item={item}
                    onPause={() => pauseDownload(item.id)}
                    onResume={() => resumeDownload(item.id)}
                    onRetry={() => retryDownload(item.id)}
                    onCancel={() => cancelDownload(item.id)}
                    onDelete={() => handleDismissItem(item)}
                    onOpen={() => handleOpenItem(item)}
                  />
                ))}
              </DownloadTitleCard>
            </SwipeableRow>
          ))
        ) : (
          <View className="items-center gap-2 py-16">
            <Text variant="h3">No downloads found</Text>
            <Text tone="muted" className="text-center">
              {activeTab === 'all'
                ? 'Download anime episodes, manga chapters, or web novels from their detail screens to read or watch offline.'
                : `No items currently in the ${activeTab} section.`}
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}
