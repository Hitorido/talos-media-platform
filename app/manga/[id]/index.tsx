import { SourceWebsiteButton } from '@/components/content/SourceWebsiteButton';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BulkDownloadModal } from '@/components/downloads';
import { ChapterList, LanguageSelector, MangaDetailsHeader } from '@/components/manga';
import { Badge, Button, Screen, Text } from '@/components/ui';
import { useMangaContent } from '@/hooks/useMangaContent';
import { mangaReadHref } from '@/lib/routes';
import { getProviderDisplayName, resolveMediaRef } from '@/services/contentService';
import { downloadMangaChapter } from '@/services/downloadService';
import { useMangaProgressStore } from '@/stores/mangaProgressStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { getLanguageDisplayName } from '@/utils/languageUtils';

export default function MangaDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { manga, loading, error, isProviderContent } = useMangaContent(id);
  const preferredLanguage = useSettingsStore((state) => state.preferredLanguage);
  const setPreferredLanguage = useSettingsStore((state) => state.setPreferredLanguage);

  const latestProgress = useMangaProgressStore((state) =>
    manga ? state.getMangaProgress(manga.id) : undefined,
  );
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedLanguageOverride, setSelectedLanguageOverride] = useState<string | null>(null);

  const mediaRef = useMemo(() => (id ? resolveMediaRef(id) : null), [id]);
  const sourceName = mediaRef ? getProviderDisplayName(mediaRef.providerId) : 'Unknown source';

  const { availableLanguages, chaptersByLanguageCount } = useMemo(() => {
    if (!manga) return { availableLanguages: [], chaptersByLanguageCount: {} };
    const counts: Record<string, number> = {};
    for (const ch of manga.chapters) {
      const lang = (ch.language || 'en').toLowerCase();
      counts[lang] = (counts[lang] ?? 0) + 1;
    }
    return {
      availableLanguages: Object.keys(counts),
      chaptersByLanguageCount: counts,
    };
  }, [manga]);

  const activeLanguage = useMemo(() => {
    if (selectedLanguageOverride !== null) {
      return selectedLanguageOverride;
    }
    if (availableLanguages.length === 0) {
      return 'en';
    }
    const pref = preferredLanguage.toLowerCase();
    if (availableLanguages.includes(pref)) {
      return pref;
    }
    if (availableLanguages.includes('en')) {
      return 'en';
    }
    return availableLanguages[0] ?? 'all';
  }, [selectedLanguageOverride, availableLanguages, preferredLanguage]);

  const filteredChapters = useMemo(() => {
    if (!manga) return [];
    if (activeLanguage === 'all') {
      return manga.chapters;
    }
    return manga.chapters.filter(
      (ch) => (ch.language || 'en').toLowerCase() === activeLanguage.toLowerCase(),
    );
  }, [manga, activeLanguage]);

  if (loading) {
    return (
      <Screen contentContainerClassName="flex-grow items-center justify-center gap-3">
        <ActivityIndicator size="large" />
        <Text tone="muted">Loading manga details...</Text>
      </Screen>
    );
  }

  if (!manga || error) {
    return (
      <Screen scrollable contentContainerClassName="flex-grow justify-center gap-4">
        <Text variant="h2">Manga not found</Text>
        {error ? <Text tone="muted">{error}</Text> : null}
        <SourceWebsiteButton routeId={id} />
        <Button label="Go back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const continueChapter =
    filteredChapters.find((chapter) => chapter.id === latestProgress?.chapterId) ??
    filteredChapters[0] ??
    manga.chapters[0];

  const getChapterProgress = (chapterId: string) => {
    if (!latestProgress || latestProgress.chapterId !== chapterId) {
      return undefined;
    }

    return latestProgress.totalPages > 0
      ? latestProgress.pageNumber / latestProgress.totalPages
      : undefined;
  };

  const openChapter = (chapterId: string) => {
    router.push(mangaReadHref(manga.id, chapterId));
  };

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguageOverride(lang);
    if (lang !== 'all') {
      setPreferredLanguage(lang);
    }
  };

  return (
    <Screen scrollable contentContainerClassName="gap-6 pb-8">
      <MangaDetailsHeader manga={manga} />

      <View className="flex-row flex-wrap items-center gap-2">
        <Badge label={`Source: ${sourceName}`} variant="secondary" />
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(tabs)/search',
              params: { q: manga.title },
            })
          }
          className="rounded-full border border-neutral-200 px-3 py-1.5 dark:border-neutral-700"
        >
          <Text variant="caption">Find other sources</Text>
        </Pressable>
      </View>

      {isProviderContent ? (
        <View className="rounded-xl border border-primary-500/30 bg-primary-500/10 px-3 py-2">
          <Text variant="caption" className="text-primary-600 dark:text-primary-400">
            Loaded from {sourceName}. Downloads may be unavailable depending on provider
            permissions. Use Find other sources to compare enabled providers without changing this
            entry's progress.
          </Text>
        </View>
      ) : null}

      {continueChapter ? (
        <Button
          label={
            latestProgress
              ? `Continue ${latestProgress.chapterTitle} (P. ${latestProgress.pageNumber})`
              : `Read ${continueChapter.title}`
          }
          onPress={() => openChapter(continueChapter.id)}
        />
      ) : null}

      <View className="gap-3">
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <View className="flex-row items-center gap-2">
            <Text variant="h3">
              Chapters ({filteredChapters.length}
              {activeLanguage !== 'all' && manga.chapters.length !== filteredChapters.length
                ? ` of ${manga.chapters.length}`
                : ''}
              )
            </Text>
            {activeLanguage !== 'all' && availableLanguages.length > 1 ? (
              <View className="rounded-md bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
                <Text
                  variant="caption"
                  className="text-xs font-medium text-neutral-600 dark:text-neutral-400"
                >
                  {getLanguageDisplayName(activeLanguage)}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="flex-row items-center gap-2">
            {availableLanguages.length > 0 ? (
              <LanguageSelector
                availableLanguages={availableLanguages}
                selectedLanguage={activeLanguage}
                chaptersByLanguageCount={chaptersByLanguageCount}
                totalReleasesCount={manga.chapters.length}
                onSelectLanguage={handleLanguageChange}
              />
            ) : null}

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
        </View>

        <ChapterList
          mangaId={manga.id}
          chapters={filteredChapters}
          activeChapterId={latestProgress?.chapterId}
          showLanguageBadge={activeLanguage === 'all' || availableLanguages.length > 1}
          getChapterProgress={getChapterProgress}
          onChapterPress={(chapter) => openChapter(chapter.id)}
          onDownloadChapter={
            isProviderContent ? undefined : (chapter) => downloadMangaChapter(manga, chapter)
          }
        />
      </View>

      {!isProviderContent ? (
        <BulkDownloadModal
          visible={bulkModalOpen}
          target={manga ? { kind: 'manga', manga, chapters: filteredChapters } : null}
          onClose={() => setBulkModalOpen(false)}
        />
      ) : null}
    </Screen>
  );
}
