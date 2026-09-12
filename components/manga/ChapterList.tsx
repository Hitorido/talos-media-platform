import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ProgressBar } from '@/components/home/ProgressBar';
import { Badge, Text } from '@/components/ui';
import { useDownloadStore } from '@/stores/downloadStore';
import type { MangaChapter } from '@/types/manga';
import { cn } from '@/utils/cn';
import { formatChapterDate } from '@/utils/formatDate';

import { getLanguageBadge } from '@/utils/languageUtils';

type ChapterListItemProps = {
  chapter: MangaChapter;
  mangaId?: string;
  progress?: number;
  isActive?: boolean;
  showLanguageBadge?: boolean;
  onPress?: () => void;
  onDownloadPress?: () => void;
};

export function ChapterListItem({
  chapter,
  mangaId,
  progress,
  isActive,
  showLanguageBadge,
  onPress,
  onDownloadPress,
}: ChapterListItemProps) {
  const download = useDownloadStore((state) =>
    mangaId ? state.getDownload(mangaId, chapter.id) : undefined,
  );

  const isDownloaded = download?.status === 'completed';
  const isDownloading = download?.status === 'downloading' || download?.status === 'queued';
  const langBadge = chapter.language ? getLanguageBadge(chapter.language) : null;

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
          <View className="flex-row flex-wrap items-center gap-2">
            <Text variant="label">{chapter.title}</Text>
            {showLanguageBadge && langBadge ? (
              <View className="rounded bg-neutral-100 px-1.5 py-0.5 border border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700">
                <Text className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                  {langBadge}
                </Text>
              </View>
            ) : null}
            {isDownloaded ? <Badge label="Offline" variant="secondary" /> : null}
          </View>

          <Text variant="caption" tone="muted">
            {chapter.pageCount > 0 ? `${chapter.pageCount} pages · ` : ''}Released{' '}
            {formatChapterDate(chapter.releaseDate)}
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

type ChapterListProps = {
  mangaId?: string;
  chapters: MangaChapter[];
  activeChapterId?: string;
  showLanguageBadge?: boolean;
  getChapterProgress?: (chapterId: string) => number | undefined;
  onChapterPress: (chapter: MangaChapter) => void;
  onDownloadChapter?: (chapter: MangaChapter) => void;
};

export function ChapterList({
  mangaId,
  chapters,
  activeChapterId,
  showLanguageBadge,
  getChapterProgress,
  onChapterPress,
  onDownloadChapter,
}: ChapterListProps) {
  return (
    <View className="gap-3">
      {chapters.map((chapter) => (
        <ChapterListItem
          key={chapter.id}
          mangaId={mangaId}
          chapter={chapter}
          isActive={chapter.id === activeChapterId}
          showLanguageBadge={showLanguageBadge}
          progress={getChapterProgress?.(chapter.id)}
          onPress={() => onChapterPress(chapter)}
          onDownloadPress={onDownloadChapter ? () => onDownloadChapter(chapter) : undefined}
        />
      ))}
    </View>
  );
}
