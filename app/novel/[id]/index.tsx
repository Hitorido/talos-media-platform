import { SourceWebsiteButton } from '@/components/content/SourceWebsiteButton';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { NovelChapterList, NovelDetailsHeader } from '@/components/novel';
import { BulkDownloadModal } from '@/components/downloads';
import { Button, Screen, Text } from '@/components/ui';
import { useNovelContent } from '@/hooks/useNovelContent';
import { novelReadHref } from '@/lib/routes';
import { downloadNovelChapter } from '@/services/downloadService';
import { useNovelProgressStore } from '@/stores/novelProgressStore';

export default function NovelDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { novel, loading, error, isProviderContent } = useNovelContent(id);
  const latestProgress = useNovelProgressStore((state) =>
    novel ? state.getNovelProgress(novel.id) : undefined,
  );
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  if (loading) {
    return (
      <Screen contentContainerClassName="flex-grow items-center justify-center gap-3">
        <ActivityIndicator size="large" />
        <Text tone="muted">Loading novel details...</Text>
      </Screen>
    );
  }

  if (!novel || error) {
    return (
      <Screen scrollable contentContainerClassName="flex-grow justify-center gap-4">
        <Text variant="h2">Novel not found</Text>
        {error ? <Text tone="muted">{error}</Text> : null}
        <SourceWebsiteButton routeId={id} />
        <Button label="Go back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const continueChapter =
    novel.chapters.find((chapter) => chapter.id === latestProgress?.chapterId) ?? novel.chapters[0];

  const getChapterProgress = (chapterId: string) => {
    if (!latestProgress || latestProgress.chapterId !== chapterId) {
      return undefined;
    }
    return latestProgress.scrollPercentage;
  };

  const openChapter = (chapterId: string) => {
    router.push(novelReadHref(novel.id, chapterId));
  };

  return (
    <Screen scrollable contentContainerClassName="gap-6 pb-8">
      <NovelDetailsHeader novel={novel} />

      {isProviderContent ? (
        <View className="rounded-xl border border-primary-500/30 bg-primary-500/10 px-3 py-2">
          <Text variant="caption" className="text-primary-600 dark:text-primary-400">
            Loaded from a novel provider. Chapter text is resolved through the provider layer
            (configured novel backend when available). Failures will not silently switch to demo text.
          </Text>
        </View>
      ) : (
        <View className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <Text variant="caption" className="text-amber-700 dark:text-amber-300">
            Demo catalog novel. Reader content is labeled Demo Content — local sample text for
            development.
          </Text>
        </View>
      )}

      {continueChapter ? (
        <Button
          label={
            latestProgress
              ? `Continue ${latestProgress.chapterTitle} (${Math.round(latestProgress.scrollPercentage * 100)}%)`
              : `Read ${continueChapter.title}`
          }
          onPress={() => openChapter(continueChapter.id)}
        />
      ) : null}

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text variant="h3">Chapters ({novel.chapters.length})</Text>
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
        <NovelChapterList
          novelId={novel.id}
          chapters={novel.chapters}
          activeChapterId={latestProgress?.chapterId}
          getChapterProgress={getChapterProgress}
          onChapterPress={(chapter) => openChapter(chapter.id)}
          onDownloadChapter={
            isProviderContent ? undefined : (chapter) => downloadNovelChapter(novel, chapter)
          }
        />
      </View>

      {!isProviderContent ? (
        <BulkDownloadModal
          visible={bulkModalOpen}
          target={novel ? { kind: 'novel', novel, chapters: novel.chapters } : null}
          onClose={() => setBulkModalOpen(false)}
        />
      ) : null}
    </Screen>
  );
}

