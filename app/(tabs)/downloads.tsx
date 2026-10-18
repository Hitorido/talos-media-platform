import { unlockPrivate } from '@/stores/privacyStore';
import { useWindowDimensions, View } from 'react-native';
import { useLibraryStore } from '@/stores/libraryStore';
import { PopPressable } from '@/components/ui/PopPressable';
import { DownloadTitleCard } from '@/components/downloads/DownloadTitleCard';
import { useHiddenPrivateIds } from '@/hooks/useHiddenPrivateIds';
import { groupDownloads } from '@/services/downloadGroups';
import { appAlert as Alert } from '@/stores/dialogStore';
import { useMemo, useState } from 'react';

import { DownloadSectionTabs } from '@/components/downloads';
import { Button, Screen, Text } from '@/components/ui';
import { clearCompletedDownloads, deleteDownload, retryDownload } from '@/services/downloadService';
import { useDownloadStore } from '@/stores/downloadStore';
import type { DownloadSectionTab } from '@/types/download';

function formatTotalSize(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1000) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export default function DownloadsScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const gridWidth = windowWidth >= 700 ? 170 : undefined;

  const itemsMap = useDownloadStore((state) => state.items);
  const hidden = useHiddenPrivateIds();
  const entries = useLibraryStore((s) => s.entries);
  const tags = useLibraryStore((s) => s.tags);
  const [selectedTag, setSelectedTag] = useState('all');
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
      .filter(
        (item) =>
          selectedTag === 'all' ||
          entries.some(
            (entry) =>
              entry.mediaId === item.mediaId &&
              (entry.tags.includes(selectedTag) ||
                (selectedTag === 'Favorites' && entry.isFavorite)),
          ),
      )
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
  }, [items, activeTab, selectedTag, entries]);

  const totalDownloadedBytes = useMemo(() => {
    return items
      .filter((i) => i.status === 'completed')
      .reduce((sum, i) => sum + (i.bytesDownloaded || 0), 0);
  }, [items]);

  const groupedItems = useMemo(() => groupDownloads(filteredItems), [filteredItems]);

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

      <View className="flex-row flex-wrap gap-2 px-4">
        {['all', ...tags].map((tag) => (
          <PopPressable
            key={tag}
            onPress={async () => {
              if (tag === 'Private' && !(await unlockPrivate())) return;
              setSelectedTag(tag);
            }}
            className={
              selectedTag === tag
                ? 'rounded-full bg-primary-600 px-3 py-2'
                : 'rounded-full bg-neutral-200 px-3 py-2 dark:bg-neutral-800'
            }
          >
            <Text style={selectedTag === tag ? { color: '#fff' } : undefined}>
              {tag === 'all' ? 'All tags' : tag}
            </Text>
          </PopPressable>
        ))}
      </View>
      {/* Swipe hint */}
      {groupedItems.length > 0 ? (
        <View className="px-4">
          <Text variant="caption" tone="muted" className="text-center">
            Swipe right on a title to delete all its downloads, or on an expanded chapter to delete
            only that chapter
          </Text>
        </View>
      ) : null}

      {/* Download Items List */}
      <View className="flex-row flex-wrap items-start gap-3 px-4">
        {groupedItems.length > 0 ? (
          groupedItems.map((group) => (
            <View key={group.key} style={{ width: gridWidth ?? '30%', maxWidth: 240 }}>
              <DownloadTitleCard poster group={group} />
            </View>
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
