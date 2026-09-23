import { SourceWebsiteButton } from '@/components/content/SourceWebsiteButton';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import {
    HorizontalReader,
    HorizontalReaderRef,
    MangaReaderControls,
    MangaReaderHeader,
    VerticalReader,
    VerticalReaderRef,
} from '@/components/manga';
import { Text } from '@/components/ui';
import { useMangaContent } from '@/hooks/useMangaContent';
import { getMangaChapterPages } from '@/services/contentService';
import { resolveMangaPages } from '@/services/offlineResolver';
import { useMangaProgressStore } from '@/stores/mangaProgressStore';
import type { MangaChapter, MangaPage, ReadingDirection, ReadingMode } from '@/types/manga';
import { cn } from '@/utils/cn';

export default function MangaReaderScreen() {
  const router = useRouter();
  const { id, chapterId } = useLocalSearchParams<{ id: string; chapterId: string }>();

  const { manga, loading: mangaLoading, error: mangaError } = useMangaContent(id);
  const setChapterProgress = useMangaProgressStore((state) => state.setChapterProgress);

  const [initialPage] = useState(
    () => useMangaProgressStore.getState().getChapterProgress(id, chapterId)?.pageNumber ?? 1,
  );

  // Track the currently visible chapter (changes as user scrolls in webtoon mode)
  const [activeChapterId, setActiveChapterId] = useState(chapterId);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [readingMode, setReadingMode] = useState<ReadingMode>('vertical');
  const [readingDirection, setReadingDirection] = useState<ReadingDirection>('rtl');
  const [overlayVisible, setOverlayVisible] = useState<boolean>(true);
  const [showModeOptions, setShowModeOptions] = useState<boolean>(false);
  const [showChapterPicker, setShowChapterPicker] = useState<boolean>(false);
  const [chapterToast, setChapterToast] = useState<{ visible: boolean; title: string }>({
    visible: false,
    title: '',
  });
  const [offlinePagesByChapter, setOfflinePagesByChapter] = useState<Record<string, MangaPage[]>>({});
  const [providerPagesByChapter, setProviderPagesByChapter] = useState<Record<string, MangaPage[]>>({});
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pagesError, setPagesError] = useState<string | null>(null);

  const verticalRef = useRef<VerticalReaderRef>(null);
  const horizontalRef = useRef<HorizontalReaderRef>(null);
  const lastSavedRef = useRef<{ chapterId: string; page: number }>({
    chapterId,
    page: initialPage,
  });

  useEffect(() => {
    if (!manga) return;
    let isMounted = true;
    Promise.all(
      manga.chapters.map(async (ch) => {
        const resolved = await resolveMangaPages(manga.id, ch.id, ch.pages);
        return { chapterId: ch.id, pages: resolved.pages, isOffline: resolved.isOffline };
      }),
    ).then((results) => {
      if (!isMounted) return;
      const map: Record<string, MangaPage[]> = {};
      for (const res of results) {
        if (res.isOffline) {
          map[res.chapterId] = res.pages;
        }
      }
      setOfflinePagesByChapter(map);
    });

    return () => {
      isMounted = false;
    };
  }, [manga]);

  useEffect(() => {
    if (!manga) return;

    const chapter = manga.chapters.find((entry) => entry.id === chapterId);
    if (!chapter) return;
    if (chapter.pages.length > 0 || offlinePagesByChapter[chapterId]?.length) return;
    if (providerPagesByChapter[chapterId]?.length) return;

    let cancelled = false;
    setPagesLoading(true);
    setPagesError(null);

    getMangaChapterPages(id, chapterId)
      .then((pages) => {
        if (cancelled) return;
        if (pages.length === 0) {
          setPagesError('No pages were returned for this chapter.');
          return;
        }
        setProviderPagesByChapter((current) => ({
          ...current,
          [chapterId]: pages,
        }));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to load chapter pages.';
        setPagesError(message);
      })
      .finally(() => {
        if (!cancelled) {
          setPagesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chapterId, id, manga, offlinePagesByChapter, providerPagesByChapter]);

  // Determine active language of the currently opened chapter
  const currentChapterLanguage = useMemo(() => {
    if (!manga) return 'en';
    const current = manga.chapters.find((ch) => ch.id === activeChapterId) ??
      manga.chapters.find((ch) => ch.id === chapterId);
    return (current?.language || 'en').toLowerCase();
  }, [manga, activeChapterId, chapterId]);

  // Filter relevant chapters to the same language (or all if only 1 language exists)
  const languageChapters = useMemo<MangaChapter[]>(() => {
    if (!manga) return [];
    const hasMultipleLanguages = new Set(manga.chapters.map((c) => (c.language || 'en').toLowerCase())).size > 1;
    if (!hasMultipleLanguages) return manga.chapters;
    return manga.chapters.filter(
      (ch) => (ch.language || 'en').toLowerCase() === currentChapterLanguage,
    );
  }, [manga, currentChapterLanguage]);

  const chaptersToLoad = useMemo<MangaChapter[]>(() => {
    if (!manga) return [];
    const sourceChapters = languageChapters.length > 0 ? languageChapters : manga.chapters;
    return sourceChapters.map((ch) => {
      const pages = offlinePagesByChapter[ch.id] || providerPagesByChapter[ch.id] || ch.pages;
      return {
        ...ch,
        pages,
        pageCount: pages.length > 0 ? pages.length : ch.pageCount,
      };
    });
  }, [manga, languageChapters, offlinePagesByChapter, providerPagesByChapter]);

  const activeChapter = chaptersToLoad.find((ch) => ch.id === activeChapterId) ?? chaptersToLoad[0];
  const prevChapter = useMemo(() => {
    if (!chaptersToLoad.length) return undefined;
    const idx = chaptersToLoad.findIndex((ch) => ch.id === activeChapterId);
    return idx > 0 ? chaptersToLoad[idx - 1] : undefined;
  }, [activeChapterId, chaptersToLoad]);
  const nextChapter = useMemo(() => {
    if (!chaptersToLoad.length) return undefined;
    const idx = chaptersToLoad.findIndex((ch) => ch.id === activeChapterId);
    return idx >= 0 && idx < chaptersToLoad.length - 1 ? chaptersToLoad[idx + 1] : undefined;
  }, [activeChapterId, chaptersToLoad]);

  const saveProgress = useCallback(
    (chId: string, page: number) => {
      if (!manga) return;
      const ch = chaptersToLoad.find((c) => c.id === chId);
      if (!ch) return;
      if (lastSavedRef.current.chapterId === chId && lastSavedRef.current.page === page) return;
      lastSavedRef.current = { chapterId: chId, page };
      setChapterProgress({
        mangaId: manga.id,
        chapterId: chId,
        chapterNumber: ch.number,
        chapterTitle: ch.title,
        pageNumber: page,
        totalPages: ch.pageCount,
        updatedAt: Date.now(),
      });
    },
    [manga, chaptersToLoad, setChapterProgress],
  );

  const handlePageChange = useCallback(
    (chId: string, page: number) => {
      if (chId !== activeChapterId) {
        setActiveChapterId(chId);
      }
      setCurrentPage(page);
      saveProgress(chId, page);
    },
    [activeChapterId, saveProgress],
  );

  const handleChapterChange = useCallback((chId: string) => {
    setActiveChapterId((current) => (current === chId ? current : chId));
  }, []);

  useEffect(() => {
    if (!activeChapter) return;

    const showTimeout = setTimeout(() => {
      setChapterToast({ visible: true, title: activeChapter.title });
    }, 0);
    const hideTimeout = setTimeout(() => {
      setChapterToast((prev) => ({ ...prev, visible: false }));
    }, 3000);

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(hideTimeout);
    };
  }, [activeChapterId, activeChapter]);

  // Tap on reader: toggle overlay (header + bottom bar)
  const toggleOverlay = () => setOverlayVisible((prev) => !prev);

  // Options button: keep overlay visible, toggle mode options row
  const handleToggleOptions = () => {
    setOverlayVisible(true);
    setShowModeOptions((prev) => !prev);
  };

  const handlePrevPage = () => {
    if (readingMode === 'horizontal') {
      if (currentPage > 1) {
        const targetPage = currentPage - 1;
        setCurrentPage(targetPage);
        saveProgress(activeChapterId, targetPage);
        horizontalRef.current?.scrollToPage(targetPage);
        return;
      }

      if (prevChapter) {
        setActiveChapterId(prevChapter.id);
        setCurrentPage(prevChapter.pageCount);
        saveProgress(prevChapter.id, prevChapter.pageCount);
        return;
      }
      return;
    }

    if (currentPage > 1) {
      const targetPage = currentPage - 1;
      setCurrentPage(targetPage);
      saveProgress(activeChapterId, targetPage);
      verticalRef.current?.scrollToPage(targetPage);
    }
  };

  const handleNextPage = () => {
    if (readingMode === 'horizontal') {
      if (activeChapter && currentPage < activeChapter.pageCount) {
        const targetPage = currentPage + 1;
        setCurrentPage(targetPage);
        saveProgress(activeChapterId, targetPage);
        horizontalRef.current?.scrollToPage(targetPage);
        return;
      }

      if (nextChapter) {
        setActiveChapterId(nextChapter.id);
        setCurrentPage(1);
        saveProgress(nextChapter.id, 1);
        return;
      }
      return;
    }

    if (activeChapter && currentPage < activeChapter.pageCount) {
      const targetPage = currentPage + 1;
      setCurrentPage(targetPage);
      saveProgress(activeChapterId, targetPage);
      verticalRef.current?.scrollToPage(targetPage);
    } else if (nextChapter) {
      setActiveChapterId(nextChapter.id);
      verticalRef.current?.scrollToPage(1);
    }
  };

  const handleSeekPage = (page: number, animated = true) => {
    const targetPage = Math.max(1, Math.min(page, activeChapter?.pageCount ?? page));
    setCurrentPage(targetPage);
    saveProgress(activeChapterId, targetPage);

    if (readingMode === 'horizontal') {
      horizontalRef.current?.scrollToPage(targetPage, animated);
    } else {
      verticalRef.current?.scrollToPage(targetPage, animated);
    }
  };

  const handlePrevChapter = () => {
    if (prevChapter) {
      if (readingMode === 'vertical') {
        setActiveChapterId(prevChapter.id);
        verticalRef.current?.scrollToPage(1);
      } else {
        setActiveChapterId(prevChapter.id);
        setCurrentPage(prevChapter.pageCount);
        saveProgress(prevChapter.id, prevChapter.pageCount);
      }
    }
  };

  const handleNextChapter = () => {
    if (nextChapter) {
      if (readingMode === 'vertical') {
        setActiveChapterId(nextChapter.id);
        verticalRef.current?.scrollToPage(1);
      } else {
        setActiveChapterId(nextChapter.id);
        setCurrentPage(1);
        saveProgress(nextChapter.id, 1);
      }
    }
  };

  const openChapterPicker = () => setShowChapterPicker(true);

  const selectChapter = (chapterIdToOpen: string) => {
    setShowChapterPicker(false);
    if (chapterIdToOpen !== activeChapterId) {
      const chapter = manga?.chapters.find((item) => item.id === chapterIdToOpen);
      setActiveChapterId(chapterIdToOpen);
      setCurrentPage(1);
      if (readingMode === 'horizontal') {
        horizontalRef.current?.scrollToChapterPage(chapterIdToOpen, 1);
      } else {
        verticalRef.current?.scrollToChapterPage(chapterIdToOpen, 1);
      }
      if (chapter) {
        saveProgress(chapterIdToOpen, 1);
      }
    }
  };

  useEffect(() => {
    setActiveChapterId(chapterId);
    setCurrentPage(initialPage);
    lastSavedRef.current = { chapterId, page: initialPage };
  }, [chapterId, initialPage]);

  if (mangaLoading || pagesLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <Stack.Screen options={{ headerShown: true, title: 'Reader' }} />
        <Text className="text-white">Loading chapter...</Text>
      </View>
    );
  }

  if (pagesError) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <Stack.Screen options={{ headerShown: true, title: 'Reader' }} />
        <Text className="text-center text-white">{pagesError}</Text>
        <SourceWebsiteButton routeId={id} chapterId={chapterId} />
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text tone="primary">Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!manga || !activeChapter || mangaError) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <Stack.Screen options={{ headerShown: true, title: 'Reader' }} />
        <Text className="text-white">Unable to load this chapter.</Text>
        <SourceWebsiteButton routeId={id} chapterId={chapterId} />
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text tone="primary">Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Header */}
      {overlayVisible ? (
        <MangaReaderHeader
          mangaTitle={manga.title}
          chapterTitle={activeChapter.title}
          onBack={() => router.back()}
          onToggleControls={handleToggleOptions}
          onOpenChapterList={openChapterPicker}
        />
      ) : null}

      {/* Reader Content */}
      <View className="flex-1">
        {readingMode === 'vertical' ? (
          <VerticalReader
            key="webtoon-reader"
            ref={verticalRef}
            chapters={chaptersToLoad}
            activeChapterId={activeChapterId}
            initialPage={initialPage}
            onPageChange={handlePageChange}
            onChapterChange={handleChapterChange}
            onTapScreen={toggleOverlay}
          />
        ) : (
          <HorizontalReader
            ref={horizontalRef}
            pages={chaptersToLoad.flatMap((chapter) =>
              chapter.pages.map((page) => ({
                ...page,
                chapterId: chapter.id,
                chapterNumber: chapter.number,
              })),
            )}
            activeChapterId={activeChapterId}
            direction={readingDirection}
            initialPage={currentPage}
            onPageChange={handlePageChange}
            onTapScreen={toggleOverlay}
          />
        )}
      </View>

      {/* Always-visible bottom bar + optional mode switcher */}
      {overlayVisible ? (
        <MangaReaderControls
          currentPage={currentPage}
          totalPages={activeChapter.pageCount}
          mode={readingMode}
          direction={readingDirection}
          hasPrevChapter={Boolean(prevChapter)}
          hasNextChapter={Boolean(nextChapter)}
          showModeOptions={showModeOptions}
          onSelectMode={setReadingMode}
          onSelectDirection={setReadingDirection}
          onPrevPage={handlePrevPage}
          onNextPage={handleNextPage}
          onPrevChapter={handlePrevChapter}
          onNextChapter={handleNextChapter}
          onSeekPage={handleSeekPage}
        />
      ) : null}

      <View
        pointerEvents="none"
        className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/75 px-4 py-2"
        style={{ opacity: chapterToast.visible ? 1 : 0 }}
      >
        <Text className="text-xs font-semibold text-white">{chapterToast.title}</Text>
      </View>

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
            <ScrollView className="max-h-80">
              {chaptersToLoad.map((chapter) => (
                <Pressable
                  key={chapter.id}
                  onPress={() => selectChapter(chapter.id)}
                  className={cn(
                    'mb-2 flex-row items-center justify-between rounded-xl border px-3 py-3',
                    chapter.id === activeChapterId
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-neutral-800 bg-neutral-900',
                  )}
                >
                  <Text
                    className={cn(
                      'flex-1 text-sm font-medium',
                      chapter.id === activeChapterId ? 'text-primary-400' : 'text-white',
                    )}
                  >
                    Chapter {chapter.number}: {chapter.title}
                  </Text>
                  {chapter.language ? (
                    <View className="ml-2 rounded bg-neutral-800 px-1.5 py-0.5 border border-neutral-700">
                      <Text className="text-[10px] font-bold text-neutral-400">
                        {chapter.language.toUpperCase()}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
