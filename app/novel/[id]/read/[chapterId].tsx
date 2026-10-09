import { PrivacyAccessGate } from '@/components/content/PrivacyControls';
import { SourceWebsiteButton } from '@/components/content/SourceWebsiteButton';
import { PopPressable as Pressable } from '@/components/ui/PopPressable';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Modal, View } from 'react-native';

import {
    NovelReaderControls,
    NovelReaderHeader,
    NovelReaderText,
    NovelReaderTextRef,
} from '@/components/novel';
import { Badge, Text } from '@/components/ui';
import { useNovelContent } from '@/hooks/useNovelContent';
import { novelDetailsHref } from '@/lib/routes';
import { getProviderDisplayName, resolveNovelChapterContent } from '@/services/contentService';
import { maintainNovelDownloadWindow } from '@/services/rollingDownloadService';
import { useLibraryStore } from '@/stores/libraryStore';
import { useNovelProgressStore } from '@/stores/novelProgressStore';
import { useRollingDownloadSettingsStore } from '@/stores/rollingDownloadSettingsStore';
import type { NovelChapter } from '@/types/novel';
import { cn } from '@/utils/cn';

// Stable empty cache so "no chapters loaded" never changes identity.
const EMPTY_CHAPTER_CACHE: Record<string, NovelChapter> = {};

function NovelReaderScreen() {
  const router = useRouter();
  const { id, chapterId, progress } = useLocalSearchParams<{
    id: string;
    chapterId: string;
    progress?: string;
  }>();
  const { novel, loading: novelLoading, error: novelError } = useNovelContent(id);
  const progressNovelId = novel?.id ?? id;

  // Safe back navigation — falls back to details screen on deep-link entry.
  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Cast needed: typed routes require literal path strings; our helper returns a cast Href.

      router.replace(novelDetailsHref(id) as any);
    }
  }, [router, id]);

  const settings = useNovelProgressStore((state) => state.settings);
  const rollingDownloadsEnabled = useRollingDownloadSettingsStore((state) => state.enabled);
  const rollingDownloadWindow = useRollingDownloadSettingsStore((state) => state.windowSize);
  const updateSettings = useNovelProgressStore((state) => state.updateSettings);
  const setChapterProgress = useNovelProgressStore((state) => state.setChapterProgress);
  const addBookmark = useNovelProgressStore((state) => state.addBookmark);
  const removeBookmark = useNovelProgressStore((state) => state.removeBookmark);

  const [activeChapterId, setActiveChapterId] = useState(chapterId);
  const isCurrentBookmarked = useNovelProgressStore((state) =>
    Boolean(
      progressNovelId &&
      activeChapterId &&
      state.bookmarks.some(
        (bm) =>
          bm.novelId === progressNovelId &&
          bm.chapterId === activeChapterId &&
          bm.paragraphIndex ===
            (state.getChapterProgress(progressNovelId, activeChapterId)?.paragraphIndex ?? 0),
      ),
    ),
  );

  const chapterScrollProgress = useMemo(
    () =>
      progress !== undefined && Number.isFinite(Number(progress))
        ? Math.max(0, Math.min(1, Number(progress)))
        : (useNovelProgressStore.getState().getChapterProgress(progressNovelId, chapterId)
            ?.scrollPercentage ?? 0),
    [progressNovelId, chapterId, progress],
  );

  const [overlayVisible, setOverlayVisible] = useState<boolean>(true);
  const [readingProgress, setReadingProgress] = useState(chapterScrollProgress);
  const [showSettingsSheet, setShowSettingsSheet] = useState<boolean>(false);
  const [showChapterPicker, setShowChapterPicker] = useState<boolean>(false);
  const [showChapterNavPrompt, setShowChapterNavPrompt] = useState<boolean>(false);
  const [contentCache, setContentCache] = useState<{
    novelId: string;
    chapters: Record<string, NovelChapter>;
  }>({ novelId: id, chapters: EMPTY_CHAPTER_CACHE });
  // Keying the cache by novel means switching books resets it during render,
  // with no synchronous setState cascade from an effect.
  const chaptersWithContent =
    contentCache.novelId === id ? contentCache.chapters : EMPTY_CHAPTER_CACHE;
  const writeChaptersWithContent = useCallback(
    (chapters: Record<string, NovelChapter>) => setContentCache({ novelId: id, chapters }),
    [id],
  );
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [contentProviderId, setContentProviderId] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  // Lazy state init keeps stable Animated.Values without reading refs during render.
  const [chapterPromptTranslate] = useState(() => new Animated.Value(80));
  const [chapterPromptOpacity] = useState(() => new Animated.Value(0));
  const novelReaderRef = useRef<NovelReaderTextRef>(null);

  const lastSavedRef = useRef<{ chapterId: string; ratio: number }>({
    chapterId,
    ratio: chapterScrollProgress,
  });

  // Route params own the active chapter and its reading progress. Adjusting
  // during render (React's documented "state from props" pattern) means a
  // chapter switch costs no extra effect-driven render pass.
  const routeProgressKey = `${chapterId}|${chapterScrollProgress}`;
  const [syncedProgressKey, setSyncedProgressKey] = useState(routeProgressKey);
  if (syncedProgressKey !== routeProgressKey) {
    setSyncedProgressKey(routeProgressKey);
    setActiveChapterId(chapterId);
    setReadingProgress(chapterScrollProgress);
  }
  useEffect(() => {
    lastSavedRef.current = { chapterId, ratio: chapterScrollProgress };
  }, [chapterId, chapterScrollProgress]);

  // Reset the chapter-navigation prompt when the active chapter changes to prevent
  // ghost overlays from stale animation state on the incoming chapter. The
  // visibility flag is derived below; only the animated values need an effect.
  const [syncedPromptChapter, setSyncedPromptChapter] = useState(activeChapterId);
  if (syncedPromptChapter !== activeChapterId) {
    setSyncedPromptChapter(activeChapterId);
    if (settings.scrollMode !== 'continuous') setShowChapterNavPrompt(false);
  }
  useEffect(() => {
    if (settings.scrollMode === 'continuous') return;
    // Snap values to hidden immediately — no animation delay means no ghost frame.
    chapterPromptOpacity.setValue(0);
    chapterPromptTranslate.setValue(80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapterId]); // intentionally minimal — only reset on chapter switch

  const loadChapterContent = useCallback(
    async (targetChapterId: string) => {
      if (!novel || !id) return null;
      const meta = novel.chapters.find((chapter) => chapter.id === targetChapterId);
      const resolved = await resolveNovelChapterContent(id, targetChapterId, meta);
      return resolved;
    },
    [id, novel],
  );

  // Latest-value holder for the already-loaded chapter cache. Written from an
  // effect rather than during render so the ref is never mutated mid-render.
  const loadedContentRef = useRef(chaptersWithContent);
  useEffect(() => {
    loadedContentRef.current = chaptersWithContent;
  });
  useEffect(() => {
    if (!novel || novel.id !== id || !id || !activeChapterId) return;
    let cancelled = false;
    setContentLoading(!loadedContentRef.current[activeChapterId]);
    setContentError(null);
    const index = novel.chapters.findIndex((ch) => ch.id === activeChapterId);
    // Continuous reading appends nearby chapters ahead of the reader; normal stays chapter-based.
    const targets =
      settings.scrollMode === 'continuous'
        ? novel.chapters.slice(Math.max(0, index), Math.max(0, index) + 3).map((ch) => ch.id)
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
          loadedContentRef.current = { ...loadedContentRef.current, [target]: result.chapter };
          writeChaptersWithContent(loadedContentRef.current);
          if (target === activeChapterId) {
            setIsOffline(result.isOffline);
            setIsDemo(result.isDemo);
            setContentProviderId(result.content.providerId ?? null);
            setContentLoading(false);
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
    return () => {
      cancelled = true;
    };
  }, [
    novel,
    id,
    activeChapterId,
    settings.scrollMode,
    loadChapterContent,
    retryNonce,
    writeChaptersWithContent,
  ]);

  const chaptersToLoad = useMemo<NovelChapter[]>(() => {
    if (!novel) return [];
    const merged = novel.chapters.map((chapter) => chaptersWithContent[chapter.id] ?? chapter);
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
  useEffect(() => {
    if (rollingDownloadsEnabled && novel) {
      void maintainNovelDownloadWindow(novel, activeChapterId);
    }
  }, [activeChapterId, novel, rollingDownloadsEnabled, rollingDownloadWindow]);

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
      // Ensure the novel is in the library store for continue reading/history
      useLibraryStore.getState().rememberMedia({
        id: progressNovelId,
        title: novel.title,
        coverUrl: novel.coverUrl,
        bannerUrl: novel.bannerUrl,
        genres: novel.genres,
        mediaType: 'novel',
        chapterCount: novel.chapters.length,
      });
    },
    [novel, progressNovelId, settings.scrollMode, setChapterProgress],
  );

  const handleChapterChange = useCallback((chId: string) => {
    setActiveChapterId((current) => (current === chId ? current : chId));
  }, []);

  // The chapter toast is derived from the active chapter; only the 3s
  // auto-dismiss needs state, so entering a chapter no longer cascades a
  // setState from inside the effect body.
  const [toastDismissedFor, setToastDismissedFor] = useState<string | null>(null);
  const chapterToast = useMemo(
    () =>
      activeChapter && toastDismissedFor !== activeChapterId
        ? { visible: true, title: activeChapter.title }
        : { visible: false, title: '' },
    [activeChapter, toastDismissedFor, activeChapterId],
  );

  useEffect(() => {
    if (!activeChapter || toastDismissedFor === activeChapterId) return;
    const timer = setTimeout(() => setToastDismissedFor(activeChapterId), 3000);
    return () => clearTimeout(timer);
  }, [activeChapterId, activeChapter, toastDismissedFor]);

  // Leaving paged mode must clear the nav prompt, otherwise it would reappear
  // the moment the reader returns to paged mode. Derived during render so the
  // animation effect below stays free of synchronous setState.
  const [syncedScrollMode, setSyncedScrollMode] = useState(settings.scrollMode);
  if (syncedScrollMode !== settings.scrollMode) {
    setSyncedScrollMode(settings.scrollMode);
    if (settings.scrollMode === 'continuous') setShowChapterNavPrompt(false);
  }

  useEffect(() => {
    if (settings.scrollMode === 'continuous') {
      Animated.parallel([
        Animated.timing(chapterPromptTranslate, {
          toValue: 80,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(chapterPromptOpacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (showChapterNavPrompt) {
      Animated.parallel([
        Animated.timing(chapterPromptTranslate, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(chapterPromptOpacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(chapterPromptTranslate, {
          toValue: 80,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(chapterPromptOpacity, {
          toValue: 0,
          duration: 120,
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
          (bm) =>
            bm.novelId === progressNovelId &&
            bm.chapterId === activeChapter.id &&
            bm.paragraphIndex ===
              (useNovelProgressStore
                .getState()
                .getChapterProgress(progressNovelId, activeChapter.id)?.paragraphIndex ?? 0),
        );
      if (existing) removeBookmark(existing.id);
    } else {
      const paragraphIndex =
        useNovelProgressStore.getState().getChapterProgress(progressNovelId, activeChapter.id)
          ?.paragraphIndex ?? 0;
      const snippetSource =
        chaptersWithContent[activeChapter.id]?.paragraphs[paragraphIndex] ??
        activeChapter.paragraphs[paragraphIndex] ??
        activeChapter.title;
      addBookmark({
        novelId: progressNovelId,
        chapterId: activeChapter.id,
        chapterTitle: activeChapter.title,
        paragraphIndex,
        scrollPercentage: readingProgress,
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
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-center text-neutral-300">Loading novel chapter...</Text>
      </View>
    );
  }

  if (novelError || !novel || contentError || !activeChapter || chaptersToLoad.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-black px-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-center text-white">Unable to load this novel chapter.</Text>
        <Text className="text-center text-neutral-400">
          {contentError ?? novelError ?? 'No chapter text was resolved from the provider.'}
        </Text>
        <Pressable onPress={retryContent} className="mt-2">
          <Text tone="primary">Retry</Text>
        </Pressable>
        <SourceWebsiteButton routeId={id} chapterId={chapterId} />
        <Pressable onPress={handleBack} className="mt-2">
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
          onBack={handleBack}
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
            <Badge label={getProviderDisplayName(contentProviderId)} variant="secondary" />
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
        onEndVisibilityChange={
          settings.scrollMode !== 'continuous' ? setShowChapterNavPrompt : undefined
        }
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
          pointerEvents={showChapterNavPrompt ? 'box-none' : 'none'}
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 80,
            elevation: 10,
            opacity: chapterPromptOpacity,
            zIndex: 10,
            transform: [{ translateY: chapterPromptTranslate }],
          }}
          className="absolute inset-x-4 bottom-20"
        >
          <View className="flex-row gap-2">
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                handlePrevChapter();
              }}
              disabled={!prevChapter}
              className={cn(
                'flex-1 rounded-full border border-neutral-700 bg-neutral-950/90 px-4 py-3 shadow-2xl',
                !prevChapter && 'opacity-40',
              )}
            >
              <Text className="text-center text-xs font-semibold text-white">Prev Chapter</Text>
            </Pressable>
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                handleNextChapter();
              }}
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
        <View className="flex-1 justify-end bg-black/35">
          <Pressable
            className="absolute inset-0"
            accessibilityLabel="Dismiss dialog"
            onPress={() => setShowChapterPicker(false)}
          />
          <View className="rounded-t-3xl bg-neutral-950 p-4 pb-8">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-white">Chapters</Text>
              <Pressable
                onPress={() => setShowChapterPicker(false)}
                className="rounded-full bg-neutral-800 px-3 py-1"
              >
                <Text className="text-sm text-white">Close</Text>
              </Pressable>
            </View>
            <FlatList
              style={{ maxHeight: 320 }}
              data={showChapterPicker ? novel.chapters : []}
              keyExtractor={(chapter) => chapter.id}
              initialNumToRender={12}
              renderItem={({ item: chapter }) => (
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
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function ProtectedScreen() {
  return (
    <PrivacyAccessGate>
      <NovelReaderScreen />
    </PrivacyAccessGate>
  );
}
