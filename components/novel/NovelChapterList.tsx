import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ProgressBar } from '@/components/home/ProgressBar';
import { Badge, Text } from '@/components/ui';
import { useDownloadStore } from '@/stores/downloadStore';
import type { NovelChapter } from '@/types/novel';
import { cn } from '@/utils/cn';

type NovelChapterListItemProps = {
  chapter: NovelChapter;
  novelId?: string;
  progress?: number;
  isActive?: boolean;
  onPress?: () => void;
  onDownloadPress?: () => void;
};

export function NovelChapterListItem({
  chapter,
  novelId,
  progress,
  isActive,
  onPress,
  onDownloadPress,
}: NovelChapterListItemProps) {
  const download = useDownloadStore((state) =>
    novelId ? state.getDownload(novelId, chapter.id) : undefined,
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
            <Text variant="label">{chapter.title}</Text>
            {isDownloaded ? (
              <Badge label="Offline" variant="secondary" />
            ) : null}
          </View>

          <Text variant="caption" tone="muted">
            {chapter.wordCount} words · Released {chapter.releaseDate}
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

type NovelChapterListProps = {
  novelId?: string;
  chapters: NovelChapter[];
  activeChapterId?: string;
  getChapterProgress?: (chapterId: string) => number | undefined;
  onChapterPress: (chapter: NovelChapter) => void;
  onDownloadChapter?: (chapter: NovelChapter) => void;
};

export function NovelChapterList({
  novelId,
  chapters,
  activeChapterId,
  getChapterProgress,
  onChapterPress,
  onDownloadChapter,
}: NovelChapterListProps) {
  return (
    <View className="gap-3">
      {chapters.map((chapter) => (
        <NovelChapterListItem
          key={chapter.id}
          novelId={novelId}
          chapter={chapter}
          isActive={chapter.id === activeChapterId}
          progress={getChapterProgress?.(chapter.id)}
          onPress={() => onChapterPress(chapter)}
          onDownloadPress={onDownloadChapter ? () => onDownloadChapter(chapter) : undefined}
        />
      ))}
    </View>
  );
}
