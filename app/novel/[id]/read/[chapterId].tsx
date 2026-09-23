import { SourceWebsiteButton } from '@/components/content/SourceWebsiteButton';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Modal, Pressable, View } from 'react-native';

import {
  NovelReaderControls,
  NovelReaderHeader,
  NovelReaderText,
  NovelReaderTextRef,
} from '@/components/novel';
import { Badge, Text } from '@/components/ui';
import { useNovelContent } from '@/hooks/useNovelContent';
import {
  getProviderDisplayName,
  resolveNovelChapterContent,
} from '@/services/contentService';
import { useNovelProgressStore } from '@/stores/novelProgressStore';
import type { NovelChapter } from '@/types/novel';
import { cn } from '@/utils/cn';

export default function NovelReaderScreen() {
  const router = useRouter();
  const { id, chapterId } = useLocalSearchParams<{ id: string; chapterId: string }>();
  const { novel, loading: novelLoading, error: novelError } = useNovelContent(id);
  const progressNovelId = novel?.id ?? id;

  const settings = useNovelProgressStore((state) => state.settings);
  const updateSettings = useNovelProgressStore((state) => state.updateSettings);
  const setChapterProgress = useNovelProgressStore((state) => state.setChapterProgress);
  const addBookmark = useNovelProgressStore((state) => state.addBookmark);
  const removeBookmark = useNovelProgressStore((state) => state.removeBookmark);

  const isCurrentBookmarked = useNovelProgressStore((state) =>
    Boolean(
      progressNovelId &&
        chapterId &&
        state.bookmarks.some(
          (bm) => bm.novelId === progressNovelId && bm.chapterId === chapterId,
        ),
    ),
  );

  const chapterScrollProgress = useMemo(() =>
    useNovelProgressStore.getState().getChapterProgress(progressNovelId, chapterId)?.scrollPercentage ?? 0,
    [progressNovelId, chapterId]);

  const [activeChapterId, setActiveChapterId] = useState(chapterId);
  const [overlayVisible, setOverlayVisible] = useState<boolean>(true);
  const [readingProgress, setReadingProgress] = useState(chapterScrollProgress);
  const [showSettingsSheet, setShowSettingsSheet] = useState<boolean>(false);
  const [showChapterPicker, setShowChapterPicker] = useState<boolean>(false);
  const [showChapterNavPrompt, setShowChapterNavPrompt] = useState<boolean>(false);
  const [chapterToast, setChapterToast] = useState<{ visible: boolean; title: string }>({
    visible: false,
    title: '',
  });
  const [chaptersWithContent, setChaptersWithContent] = useState<Record<string, NovelChapter>>({});
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [contentProviderId, setContentProviderId] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const chapterPromptTranslate = useRef(new Animated.Value(80)).current;
  const chapterPromptOpacity = useRef(new Animated.Value(0)).current;
  const novelReaderRef = useRef<NovelReaderTextRef>(null);

  const lastSavedRef = useRef<{ chapterId: string; ratio: number }>({
    chapterId,
    ratio: chapterScrollProgress,
  });

  useEffect(() => {
    setActiveChapterId(chapterId);
    setReadingProgress(chapterScrollProgress);
    lastSavedRef.current = { chapterId, ratio: chapterScrollProgress };
  }, [chapterId, chapterScrollProgress]);

  const loadChapterContent = useCallback(
    async (targetChapterId: string) => {
      if (!novel || !id) return null;
      const meta = novel.chapters.find((chapter) => chapter.id === targetChapterId);
      const resolved = await resolveNovelChapterContent(id, targetChapterId, meta);
      return resolved;
    },
    [id, novel],
  );

  const loadedContentRef = useRef(chaptersWithContent);
  loadedContentRef.current = chaptersWithContent;
  useEffect(() => { loadedContentRef.current = {}; setChaptersWithContent({}); }, [id]);
  useEffect(() => {
    if (!novel || novel.id !== id || !id || !activeChapterId) return;
    let cancelled = false;
    setContentLoading(!loadedContentRef.current[activeChapterId]);
    setContentError(null);
    const index = novel.chapters.findIndex(ch => ch.id === activeChapterId);
    // Continuous reading appends nearby chapters ahead of the reader; normal stays chapter-based.
    const targets = settings.scrollMode === 'continuous'
      ? novel.chapters.slice(Math.max(0, index), Math.max(0, index) + 3).map(ch => ch.id)
      : [activeChapterId];
    void (async () => {
      for (const target of targets) {
        if (cancelled) return;
        if (loadedContentRef.current[target]) {
          if (target === activeChapterId) setContentLoading(false);
          continue;
        }
        try {
          const result = await loadChapterContent(target);
          if (cancelled || !result) return;
          loadedContentRef.current = {...loadedContentRef.current, [target]:result.chapter};
          setChaptersWithContent(loadedContentRef.current);
          if (target === activeChapterId) {
            setIsOffline(result.isOffline); setIsDemo(result.isDemo);
            setContentProviderId(result.content.providerId ?? null); setContentLoading(false);
          }
        } catch (error) {
          if (!cancelled && target === activeChapterId) {
            setContentError(error instanceof Error ? error.message : 'Chapter unavailable.');
            setContentLoading(false);
          }
          break;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [novel, id, activeChapterId, settings.scrollMode, loadChapterContent, retryNonce]);

  const chaptersToLoad = useMemo<NovelChapter[]>(() => {
    if (!novel) return [];
    const merged = novel.chapters.map(
      (chapter) => chaptersWithContent[chapter.id] ?? chapter,
    );
    if (settings.scrollMode === 'continuous') {
      return merged.filter((chapter) => chapter.paragraphs.length > 0);
    }
    const currentIndex = merged.findIndex((chapter) => chapter.id === activeChapterId);
    if (currentIndex < 0) return [];
    const active = merged[currentIndex];
    return active.paragraphs.length > 0 ? [active] : [];
  }, [novel, activeChapterId, settings.scrollMode, chaptersWithContent]);

  const activeChapter =
    chaptersWithContent[activeChapterId] ??
    novel?.chapters.find((chapter) => chapter.id === activeChapterId);

  const prevChapter = useMemo(() => {
    if (!novel) return undefined;
    const idx = novel.chapters.findIndex((chapter) => chapter.id === activeChapterId);
    return idx > 0 ? novel.chapters[idx - 1] : undefined;
  }, [novel, activeChapterId]);

  const nextChapter = useMemo(() => {
    if (!novel) return undefined;
    const idx = novel.chapters.findIndex((chapter) => chapter.id === activeChapterId);
    return idx >= 0 && idx < novel.chapters.length - 1 ? novel.chapters[idx + 1] : undefined;
  }, [novel, activeChapterId]);

  const saveProgress = useCallback(
    (chId: string, scrollPercentage: number, paragraphIndex: number) => {
      if (!novel) return;
      const ch = novel.chapters.find((c) => c.id === chId);
      if (!ch) return;
      if (
        lastSavedRef.current.chapterId === chId &&
        Math.abs(lastSavedRef.current.ratio - scrollPercentage) < 0.05
      ) {
        return;
      }
      lastSavedRef.current = { chapterId: chId, ratio: scrollPercentage };
      setReadingProgress(scrollPercentage);
      setChapterProgress({
        novelId: progressNovelId,
        chapterId: chId,
        chapterNumber: ch.number,
        chapterTitle: ch.title,
        scrollPercentage,
        paragraphIndex,
        updatedAt: Date.now(),
      });

      if (settings.scrollMode !== 'continuous') {
        if (scrollPercentage > 0.94) {
          setShowChapterNavPrompt(true);
        } else if (scrollPercentage < 0.85) {
          setShowChapterNavPrompt(false);
        }
      }
    },
    [novel, progressNovelId, settings.scrollMode, setChapterProgress],
  );

  const handleChapterChange = useCallback((chId: string) => {
    setActiveChapterId((current) => (current === chId ? current : chId));
  }, []);

  useEffect(() => {
    if (!activeChapter) return;

    setChapterToast({ visible: true, title: activeChapter.title });
    const timeout = setTimeout(() => {
      setChapterToast((prev) => ({ ...prev, visible: false }));
    }, 3000);

    return () => clearTimeout(timeout);
  }, [activeChapterId, activeChapter]);

  useEffect(() => {
    if (settings.scrollMode === 'continuous') {
      setShowChapterNavPrompt(false);
      Animated.parallel([
        Animated.timing(chapterPromptTranslate, {
          toValue: 80,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(chapterPromptOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (showChapterNavPrompt) {
      Animated.parallel([
        Animated.spring(chapterPromptTranslate, {
          toValue: 0,
          tension: 60,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(chapterPromptOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(chapterPromptTranslate, {
          toValue: 80,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(chapterPromptOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [settings.scrollMode, showChapterNavPrompt, chapterPromptOpacity, chapterPromptTranslate]);

  const toggleControls = () => setOverlayVisible((prev) => !prev);

  const handleToggleSettingsSheet = () => {
    setOverlayVisible(true);
    setShowSettingsSheet((prev) => !prev);
  };

  const handleToggleBookmark = () => {
    if (!novel || !activeChapter) return;
    if (isCurrentBookmarked) {
      const existing = useNovelProgressStore
        .getState()
        .bookmarks.find(
          (bm) => bm.novelId === progressNovelId && bm.chapterId === activeChapter.id,
        );
      if (existing) removeBookmark(existing.id);
    } else {
      const snippetSource =
        chaptersWithContent[activeChapter.id]?.paragraphs[0] ??
        activeChapter.paragraphs[0] ??
        activeChapter.title;
      addBookmark({
        novelId: progressNovelId,
        chapterId: activeChapter.id,
        chapterTitle: activeChapter.title,
        paragraphIndex: 0,
        snippet: snippetSource.substring(0, 80),
      });
    }
  };

  const handlePrevChapter = () => {
    if (prevChapter) setActiveChapterId(prevChapter.id);
    setShowChapterNavPrompt(false);
  };

  const handleNextChapter = () => {
    if (nextChapter) setActiveChapterId(nextChapter.id);
    setShowChapterNavPrompt(false);
  };

  const openChapterPicker = () => setShowChapterPicker(true);

  const selectChapter = (chapterIdToOpen: string) => {
    setShowChapterPicker(false);
    if (chapterIdToOpen !== activeChapterId) {
      setActiveChapterId(chapterIdToOpen);
    }
  };

  const retryContent = () => {
    setContentError(null);
    setContentLoading(true);
    setRetryNonce((value) => value + 1);
  };

  if (novelLoading || (contentLoading && !chaptersToLoad.length)) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-black px-6">
        <Stack.Screen options={{ headerShown: true, title: 'Reader' }} />
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-center text-neutral-300">Loading novel chapter...</Text>
      </View>
    );
  }

  if (novelError || !novel || contentError || !activeChapter || chaptersToLoad.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-black px-6">
        <Stack.Screen options={{ headerShown: true, title: 'Reader' }} />
        <Text className="text-center text-white">Unable to load this novel chapter.</Text>
        <Text className="text-center text-neutral-400">
          {contentError ?? novelError ?? 'No chapter text was resolved from the provider.'}
        </Text>
        <Pressable onPress={retryContent} className="mt-2">
          <Text tone="primary">Retry</Text>
        </Pressable>
        <SourceWebsiteButton routeId={id} chapterId={chapterId} />
        <Pressable onPress={() => router.back()} className="mt-2">
          <Text className="text-neutral-400">Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <Stack.Screen options={{ headerShown: false }} />

      {overlayVisible ? (
        <NovelReaderHeader
          novelTitle={novel.title}
          chapterTitle={activeChapter.title}
          theme={settings.theme}
          isBookmarked={isCurrentBookmarked}
          onBack={() => router.back()}
          onToggleBookmark={handleToggleBookmark}
          onToggleSettings={handleToggleSettingsSheet}
          onOpenChapterList={openChapterPicker}
        />
      ) : null}

      {(isOffline || isDemo || contentProviderId) && overlayVisible ? (
        <View className="absolute left-4 right-4 top-24 z-20 flex-row flex-wrap gap-2">
          {isOffline ? <Badge label="Offline" variant="secondary" /> : null}
          {isDemo ? <Badge label="Demo Content" variant="secondary" /> : null}
          {!isDemo && !isOffline && contentProviderId ? (
            <Badge
              label={getProviderDisplayName(contentProviderId)}
              variant="secondary"
            />
          ) : null}
        </View>
      ) : null}

      <NovelReaderText
        ref={novelReaderRef}
        key={
          settings.scrollMode === 'continuous'
            ? `novel-continuous-${id}-${chapterId}`
            : `novel-${id}-${activeChapterId}`
        }
        chapters={chaptersToLoad}
        activeChapterId={activeChapterId}
        initialChapterId={settings.scrollMode === 'continuous' ? chapterId : activeChapterId}
        settings={settings}
        initialScrollPercentage={activeChapterId === chapterId ? chapterScrollProgress : 0}
        onScrollProgress={saveProgress}
        onChapterChange={handleChapterChange}
        onTapScreen={toggleControls}
      />

      {overlayVisible ? (
        <NovelReaderControls
          settings={settings}
          progress={readingProgress}
          onSeekProgress={(progress) => {
            setReadingProgress(progress);
            novelReaderRef.current?.scrollToProgress(progress);
          }}
          showSettingsSheet={showSettingsSheet}
          hasPrevChapter={Boolean(prevChapter)}
          hasNextChapter={Boolean(nextChapter)}
          onUpdateSettings={updateSettings}
          onPrevChapter={handlePrevChapter}
          onNextChapter={handleNextChapter}
        />
      ) : null}

      <View
        pointerEvents="none"
        className="absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full border border-white/10 bg-black/75 px-4 py-2"
        style={{ opacity: chapterToast.visible ? 1 : 0 }}
      >
        <Text className="text-xs font-semibold text-white">{chapterToast.title}</Text>
      </View>

      {settings.scrollMode !== 'continuous' ? (
        <Animated.View
          pointerEvents={showChapterNavPrompt && !showSettingsSheet ? 'auto' : 'none'}
          style={{
            position: 'absolute', left: 16, right: 16, bottom: 80, elevation: 40,
            opacity: chapterPromptOpacity,
            zIndex: showSettingsSheet ? 10 : 30,
            transform: [{ translateY: chapterPromptTranslate }],
          }}
          className="absolute inset-x-4 bottom-20 z-30"
        >
          <View className="flex-row gap-2">
            <Pressable
              onPress={(event) => { event.stopPropagation(); handlePrevChapter(); }}
              disabled={!prevChapter}
              className={cn(
                'flex-1 rounded-full border border-neutral-700 bg-neutral-950/90 px-4 py-3 shadow-2xl',
                !prevChapter && 'opacity-40',
              )}
            >
              <Text className="text-center text-xs font-semibold text-white">Prev Chapter</Text>
            </Pressable>
            <Pressable
              onPress={(event) => { event.stopPropagation(); handleNextChapter(); }}
              disabled={!nextChapter}
              className={cn(
                'flex-1 rounded-full border border-neutral-700 bg-neutral-950/90 px-4 py-3 shadow-2xl',
                !nextChapter && 'opacity-40',
              )}
            >
              <Text className="text-center text-xs font-semibold text-white">Next Chapter</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      <Modal
        transparent
        visible={showChapterPicker}
        animationType="fade"
        onRequestClose={() => setShowChapterPicker(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/35"
          onPress={() => setShowChapterPicker(false)}
        >
          <Pressable className="rounded-t-3xl bg-neutral-950 p-4 pb-8" onPress={() => undefined}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-white">Chapters</Text>
              <Pressable
                onPress={() => setShowChapterPicker(false)}
                className="rounded-full bg-neutral-800 px-3 py-1"
              >
                <Text className="text-sm text-white">Close</Text>
              </Pressable>
            </View>
            <FlatList style={{maxHeight:320}} data={showChapterPicker ? novel.chapters : []} keyExtractor={chapter => chapter.id} initialNumToRender={12} renderItem={({item:chapter}) => (
                <Pressable
                  key={chapter.id}
                  onPress={() => selectChapter(chapter.id)}
                  className={cn(
                    'mb-2 rounded-xl border px-3 py-3',
                    chapter.id === activeChapterId
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-neutral-800 bg-neutral-900',
                  )}
                >
                  <Text
                    className={cn(
                      'text-sm font-medium',
                      chapter.id === activeChapterId ? 'text-primary-400' : 'text-white',
                    )}
                  >
                    Chapter {chapter.number}: {chapter.title}
                  </Text>
                </Pressable>
              )} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
