import { preloadPage } from '@/services/mangaImageCache';
import { PrivacyAccessGate } from '@/components/content/PrivacyControls';
import { SourceWebsiteButton } from '@/components/content/SourceWebsiteButton';
import { mangaDetailsHref } from '@/lib/routes';
import { captureBookmarkPreview } from '@/services/bookmarkPreview';
import { useMediaBookmarkStore } from '@/stores/mediaBookmarkStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Modal, ScrollView, View } from 'react-native';
import { PopPressable as Pressable } from '@/components/ui/PopPressable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  HorizontalReader,
  HorizontalReaderRef,
  MangaReaderControls,
  MangaReaderHeader,
  ReaderPressable,
  VerticalReader,
  VerticalReaderRef,
} from '@/components/manga';
import { Text } from '@/components/ui';
import { useMangaContent } from '@/hooks/useMangaContent';
import { getMangaChapterPages } from '@/services/contentService';
import { resolveMangaPages } from '@/services/offlineResolver';
import { maintainMangaDownloadWindow } from '@/services/rollingDownloadService';
import { useMangaProgressStore } from '@/stores/mangaProgressStore';
import { useRollingDownloadSettingsStore } from '@/stores/rollingDownloadSettingsStore';
import type { MangaChapter, MangaPage, ReadingDirection, ReadingMode } from '@/types/manga';
import { cn } from '@/utils/cn';

/**
 * Continuous scrolling reports every page crossed. Persist the first change
 * immediately, then coalesce bursts so a long fling cannot spam storage on
 * every frame while the on-screen page indicator still updates instantly.
 */
const PROGRESS_SAVE_THROTTLE_MS = 400;

function MangaReaderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, chapterId, page, bookmark } = useLocalSearchParams<{
    id: string;
    chapterId: string;
    page?: string;
    bookmark?: string;
  }>();
  const saveBookmark = useMediaBookmarkStore((state) => state.save);
  const setCoverOverride = useLibraryStore((state) => state.setCoverOverride);
  const savedView = useMediaBookmarkStore(
    (state) =>
      state.bookmarks.find((b) => b.id === bookmark && b.mediaId === id && b.unitId === chapterId)
        ?.view,
  );
  const viewportRef = useRef<View>(null);
  const savingBookmark = useRef(false);
  const [bookmarkNotice, setBookmarkNotice] = useState('');

  const { manga, loading: mangaLoading, error: mangaError } = useMangaContent(id);
  const setChapterProgress = useMangaProgressStore((state) => state.setChapterProgress);
  const rollingDownloadsEnabled = useRollingDownloadSettingsStore((state) => state.enabled);
  const rollingDownloadWindow = useRollingDownloadSettingsStore((state) => state.windowSize);

  // Safe back navigation — falls back to details screen on deep-link entry.
  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Cast needed: typed routes require literal path strings; our helper returns a cast Href.

      router.replace(mangaDetailsHref(id) as any);
    }
  }, [router, id]);

  const initialPage = useMemo(
    () =>
      page && Number.isFinite(Number(page))
        ? Math.max(1, Math.floor(Number(page)))
        : (useMangaProgressStore.getState().getChapterProgress(id, chapterId)?.pageNumber ?? 1),
    [id, chapterId, page],
  );

  // Track the currently visible chapter (changes as user scrolls in webtoon mode)
  const [activeChapterId, setActiveChapterId] = useState(chapterId);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [modeView, setModeView] = useState(savedView);
  const [readingMode, setReadingMode] = useState<ReadingMode>(
    savedView?.mode ?? useMangaProgressStore.getState().readingModes?.[id] ?? 'vertical',
  );
  const [readingDirection, setReadingDirection] = useState<ReadingDirection>('rtl');
  const [overlayVisible, setOverlayVisible] = useState<boolean>(true);
  const overlayProgress = useSharedValue(1);
  const headerOverlayStyle = useAnimatedStyle(() => ({
    opacity: overlayProgress.value,
    transform: [{ translateY: (overlayProgress.value - 1) * 20 }],
  }));
  const controlsOverlayStyle = useAnimatedStyle(() => ({
    opacity: overlayProgress.value,
    transform: [{ translateY: (1 - overlayProgress.value) * 20 }],
  }));
  const [showModeOptions, setShowModeOptions] = useState<boolean>(false);
  const [showChapterPicker, setShowChapterPicker] = useState<boolean>(false);
  const [chapterToast, setChapterToast] = useState<{ visible: boolean; title: string }>({
    visible: false,
    title: '',
  });
  const [offlinePagesByChapter, setOfflinePagesByChapter] = useState<Record<string, MangaPage[]>>(
    {},
  );
  const [providerPagesByChapter, setProviderPagesByChapter] = useState<Record<string, MangaPage[]>>(
    {},
  );
  // Errors are scoped per chapter so switching chapters never needs a synchronous
  // reset, and loading is derived from whether the chapter has pages yet.
  const [pagesErrorByChapter, setPagesErrorByChapter] = useState<Record<string, string>>({});

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

  // Provider page loading is handled below, keyed on the active chapter so
  // prev/next navigation and continuous scrolling fetch what they display.

  // Determine active language of the currently opened chapter
  const currentChapterLanguage = useMemo(() => {
    if (!manga) return 'en';
    const current =
      manga.chapters.find((ch) => ch.id === activeChapterId) ??
      manga.chapters.find((ch) => ch.id === chapterId);
    return (current?.language || 'en').toLowerCase();
  }, [manga, activeChapterId, chapterId]);

  // Filter relevant chapters to the same language (or all if only 1 language exists)
  const languageChapters = useMemo<MangaChapter[]>(() => {
    if (!manga) return [];
    const hasMultipleLanguages =
      new Set(manga.chapters.map((c) => (c.language || 'en').toLowerCase())).size > 1;
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
  const horizontalPages = useMemo(
    () =>
      chaptersToLoad.flatMap((chapter) =>
        chapter.pages.map((chapterPage) => ({
          ...chapterPage,
          chapterId: chapter.id,
          chapterNumber: chapter.number,
        })),
      ),
    [chaptersToLoad],
  );

  const activeChapter = chaptersToLoad.find((ch) => ch.id === activeChapterId) ?? chaptersToLoad[0];

  useEffect(() => {
    if (!activeChapter?.pages.length) return;
    let cancelled = false;
    const pages = activeChapter.pages;
    // Start at the visible page, continue to the end, then fill earlier pages.
    const pivot = Math.max(
      0,
      pages.findIndex((page) => page.pageNumber === currentPage),
    );
    const ordered = [...pages.slice(pivot), ...pages.slice(0, pivot)];
    void (async () => {
      for (let index = 0; index < ordered.length && !cancelled; index += 3) {
        await Promise.all(
          ordered.slice(index, index + 3).map((page) => preloadPage(page.imageUrl)),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeChapter?.id, activeChapter?.pages, currentPage]);

  // Derived (not effect-driven): the active chapter is "loading" while it still
  // has no pages and no error has been recorded for it. Scoped to the active
  // chapter so prev/next jumps surface their own loading/error states.
  const pagesError = pagesErrorByChapter[activeChapterId] ?? null;
  const pagesLoading = Boolean(
    manga && activeChapter && activeChapter.pages.length === 0 && !pagesError,
  );

  useEffect(() => {
    if (rollingDownloadsEnabled && manga) {
      void maintainMangaDownloadWindow({ ...manga, chapters: chaptersToLoad }, activeChapterId);
    }
  }, [activeChapterId, chaptersToLoad, manga, rollingDownloadsEnabled, rollingDownloadWindow]);
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

  // Fetch pages for the active chapter plus its neighbours so chapter jumps and
  // continuous scrolling never reach a chapter whose pages are not loaded yet.
  const chapterIdsToLoad = useMemo(() => {
    const idx = chaptersToLoad.findIndex((ch) => ch.id === activeChapterId);
    if (idx < 0) return [];
    const ids: string[] = [];
    const prev = chaptersToLoad[idx - 1];
    if (prev) ids.push(prev.id);
    ids.push(chaptersToLoad[idx].id);
    const next = chaptersToLoad[idx + 1];
    if (next) ids.push(next.id);
    return ids;
  }, [activeChapterId, chaptersToLoad]);

  const pageLoads = useRef(new Set<string>());
  const pageLoadEpoch = useRef(0);
  useEffect(() => {
    pageLoads.current.clear();
    const epoch = ++pageLoadEpoch.current;
    return () => {
      pageLoadEpoch.current = epoch + 1;
    };
  }, [id]);
  useEffect(() => {
    if (!manga) return;
    const pending = chapterIdsToLoad.filter((chId) => {
      if (pageLoads.current.has(chId)) return false;
      const chapter = manga.chapters.find((entry) => entry.id === chId);
      if (!chapter) return false;
      if (chapter.pages.length > 0) return false;
      if (offlinePagesByChapter[chId]?.length) return false;
      if (providerPagesByChapter[chId]?.length) return false;
      // Failed chapters need an explicit retry (error cleared) to re-run.
      if (pagesErrorByChapter[chId]) return false;
      return true;
    });
    if (pending.length === 0) return;

    const epoch = pageLoadEpoch.current;
    void Promise.all(
      pending.map(async (chId) => {
        const chapter = manga.chapters.find((entry) => entry.id === chId);
        if (!chapter) return;
        pageLoads.current.add(chId);
        try {
          const local = await resolveMangaPages(id, chId, chapter.pages);
          const pages = local.isOffline ? local.pages : await getMangaChapterPages(id, chId);
          if (epoch !== pageLoadEpoch.current) return;
          if (pages.length === 0) {
            setPagesErrorByChapter((current) => ({
              ...current,
              [chId]: 'No pages were returned for this chapter.',
            }));
            return;
          }
          setProviderPagesByChapter((current) => ({ ...current, [chId]: pages }));
        } catch (error) {
          if (epoch !== pageLoadEpoch.current) return;
          const message = error instanceof Error ? error.message : 'Failed to load chapter pages.';
          setPagesErrorByChapter((current) => ({ ...current, [chId]: message }));
        } finally {
          if (epoch === pageLoadEpoch.current) pageLoads.current.delete(chId);
        }
      }),
    );
  }, [
    activeChapterId,
    chapterIdsToLoad,
    id,
    manga,
    offlinePagesByChapter,
    pagesErrorByChapter,
    providerPagesByChapter,
  ]);

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

  // Continuous scroll: coalesce bursts of page changes so storage writes do not
  // compete with the reader. Discrete actions (seek, prev/next) still save at once.
  const saveProgressRef = useRef(saveProgress);
  const pendingProgressRef = useRef<{ chapterId: string; page: number } | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistAtRef = useRef(0);

  useEffect(() => {
    saveProgressRef.current = saveProgress;
  }, [saveProgress]);

  const scheduleProgressSave = useCallback((chId: string, page: number) => {
    const now = Date.now();
    const elapsed = now - lastPersistAtRef.current;
    pendingProgressRef.current = { chapterId: chId, page };
    if (persistTimerRef.current) return;
    persistTimerRef.current = setTimeout(
      () => {
        persistTimerRef.current = null;
        const pending = pendingProgressRef.current;
        pendingProgressRef.current = null;
        if (!pending) return;
        lastPersistAtRef.current = Date.now();
        saveProgressRef.current(pending.chapterId, pending.page);
      },
      Math.max(16, PROGRESS_SAVE_THROTTLE_MS - elapsed),
    );
  }, []);

  // Persist the latest page when leaving or backgrounding without delaying a gesture.
  useEffect(() => {
    const flush = () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
      const pending = pendingProgressRef.current;
      pendingProgressRef.current = null;
      if (pending) saveProgressRef.current(pending.chapterId, pending.page);
    };
    const listener = AppState.addEventListener('change', (state) => {
      if (state !== 'active') flush();
    });
    return () => {
      listener.remove();
      flush();
    };
  }, []);

  const handlePageChange = useCallback(
    (chId: string, page: number) => {
      if (chId !== activeChapterId) {
        setActiveChapterId(chId);
      }
      setCurrentPage(page);
      scheduleProgressSave(chId, page);
    },
    [activeChapterId, scheduleProgressSave],
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
  const toggleOverlay = useCallback(() => {
    const next = overlayProgress.value < 0.5 ? 1 : 0;
    // Shared-value updates run on the UI thread in response to reader taps.
    // eslint-disable-next-line react-hooks/immutability
    overlayProgress.value = withTiming(next, { duration: 100 });
    setOverlayVisible(next === 1);
  }, [overlayProgress]);

  // Options button: keep overlay visible, toggle mode options row
  const handleToggleOptions = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability
    overlayProgress.value = withTiming(1, { duration: 100 });
    setOverlayVisible(true);
    setShowModeOptions((prev) => !prev);
  }, [overlayProgress]);

  // State writes do not re-render the reader before the imperative call runs,
  // so chapter-relative scroll helpers would still resolve against the
  // outgoing chapter. Every jump therefore names its destination explicitly.
  const jumpToChapterPage = useCallback(
    (targetChapter: MangaChapter, targetPage: number) => {
      setActiveChapterId(targetChapter.id);
      setCurrentPage(targetPage);
      saveProgress(targetChapter.id, targetPage);
      if (readingMode === 'horizontal') {
        horizontalRef.current?.scrollToChapterPage(targetChapter.id, targetPage);
      } else {
        verticalRef.current?.scrollToChapterPage(targetChapter.id, targetPage);
      }
    },
    [readingMode, saveProgress],
  );

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      const targetPage = currentPage - 1;
      setCurrentPage(targetPage);
      saveProgress(activeChapterId, targetPage);
      if (readingMode === 'horizontal') horizontalRef.current?.scrollToPage(targetPage);
      else verticalRef.current?.scrollToPage(targetPage);
      return;
    }

    // The page directly above a chapter's first page is the previous chapter's
    // last page — the boundary-adjacent page in both modes.
    if (prevChapter) jumpToChapterPage(prevChapter, Math.max(1, prevChapter.pageCount));
  }, [activeChapterId, currentPage, jumpToChapterPage, prevChapter, readingMode, saveProgress]);

  const handleNextPage = useCallback(() => {
    if (activeChapter && currentPage < activeChapter.pageCount) {
      const targetPage = currentPage + 1;
      setCurrentPage(targetPage);
      saveProgress(activeChapterId, targetPage);
      if (readingMode === 'horizontal') horizontalRef.current?.scrollToPage(targetPage);
      else verticalRef.current?.scrollToPage(targetPage);
      return;
    }

    if (nextChapter) {
      if (readingMode === 'horizontal') {
        jumpToChapterPage(nextChapter, 1);
      }
      // Vertical mode is continuous: once prefetched, the next chapter already
      // flows below the current one, so the boundary press just keeps scrolling.
    }
  }, [
    activeChapter,
    activeChapterId,
    currentPage,
    jumpToChapterPage,
    nextChapter,
    readingMode,
    saveProgress,
  ]);

  const handleSeekPage = useCallback(
    (page: number, animated = true) => {
      const targetPage = Math.max(1, Math.min(page, activeChapter?.pageCount ?? page));
      setCurrentPage(targetPage);
      scheduleProgressSave(activeChapterId, targetPage);

      if (readingMode === 'horizontal') {
        horizontalRef.current?.scrollToPage(targetPage, animated);
      } else {
        verticalRef.current?.scrollToPage(targetPage, animated);
      }
    },
    [activeChapter, activeChapterId, readingMode, scheduleProgressSave],
  );

  const handlePrevChapter = useCallback(() => {
    if (!prevChapter) return;
    if (readingMode === 'horizontal') {
      // Both reading directions end a chapter on its final page, so backward
      // entry lands there and the next swipe forward re-enters current content.
      jumpToChapterPage(prevChapter, Math.max(1, prevChapter.pageCount));
    } else {
      jumpToChapterPage(prevChapter, 1);
    }
  }, [jumpToChapterPage, prevChapter, readingMode]);

  const handleNextChapter = useCallback(() => {
    if (nextChapter) jumpToChapterPage(nextChapter, 1);
  }, [jumpToChapterPage, nextChapter]);

  const bookmarkView = async () => {
    if (savingBookmark.current || !activeChapter || !manga) return;
    savingBookmark.current = true;
    const location =
      readingMode === 'vertical'
        ? verticalRef.current?.getLocation()
        : horizontalRef.current?.getLocation();
    let previewUri: string | undefined;
    try {
      previewUri = await captureBookmarkPreview(viewportRef);
    } catch {
      /* Position is still useful when image capture is unavailable. */
    }
    const savedChapter =
      chaptersToLoad.find((ch) => ch.id === location?.chapterId) ?? activeChapter;
    saveBookmark({
      kind: 'manga',
      mediaId: manga.id,
      unitId: savedChapter.id,
      unitTitle: savedChapter.title,
      position: location?.pageNumber ?? currentPage,
      previewUri,
      progress: savedChapter.pages.length
        ? Math.min(
            1,
            ((location?.pageNumber ?? currentPage) - 1 + (location?.fraction ?? 0)) /
              savedChapter.pages.length,
          )
        : undefined,
      view: location
        ? {
            fraction: location.fraction,
            scale: location.scale,
            pan: location.pan,
            mode: readingMode,
          }
        : undefined,
    });
    setBookmarkNotice(previewUri ? 'View saved to Bookmarks' : 'Position saved to Bookmarks');
    savingBookmark.current = false;
  };

  const openChapterPicker = useCallback(() => setShowChapterPicker(true), []);

  const setCurrentPageAsCover = useCallback(() => {
    const pageToUse = activeChapter?.pages.find(
      (chapterPage) => chapterPage.pageNumber === currentPage,
    );
    if (!manga || !activeChapter || !pageToUse) {
      setBookmarkNotice('This page is not available as a cover yet');
      return;
    }
    const mediaType = manga.genres.includes('Manhwa')
      ? 'manhwa'
      : manga.genres.includes('Manhua')
        ? 'manhua'
        : 'manga';
    setCoverOverride(
      {
        id: manga.id,
        title: manga.title,
        coverUrl: manga.coverUrl,
        bannerUrl: manga.bannerUrl,
        mediaType,
        genres: manga.genres,
        chapterCount: manga.chapters.length,
      },
      pageToUse.imageUrl,
    );
    setBookmarkNotice(`Cover set to page ${currentPage}`);
  }, [activeChapter, currentPage, manga, setCoverOverride]);

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

  // Route params own the chapter/page. Adjust state during render (React's
  // documented "adjust state when a prop changes" pattern) instead of a
  // synchronous effect, which would cascade an extra render per navigation.
  const routeKey = `${chapterId}:${initialPage}`;
  const [syncedRouteKey, setSyncedRouteKey] = useState(routeKey);
  if (syncedRouteKey !== routeKey) {
    setSyncedRouteKey(routeKey);
    setActiveChapterId(chapterId);
    setCurrentPage(initialPage);
  }

  // Stable identities keep the memoized reader/controls from re-rendering on
  // unrelated parent state (overlay visibility, toasts, chapter picker).
  const handleSelectMode = useCallback(
    (mode: ReadingMode) => {
      const location =
        readingMode === 'horizontal'
          ? horizontalRef.current?.getLocation()
          : verticalRef.current?.getLocation();
      if (location) {
        setActiveChapterId(location.chapterId);
        setCurrentPage(location.pageNumber);
        setModeView({ ...location, scale: 1, pan: 0 });
      }
      setReadingMode(mode);
      useMangaProgressStore.getState().setReadingMode(id, mode);
    },
    [id, readingMode],
  );

  const handleSelectDirection = useCallback((next: ReadingDirection) => {
    setReadingDirection(next);
  }, []);

  const bookmarkViewRef = useRef(bookmarkView);
  useEffect(() => {
    bookmarkViewRef.current = bookmarkView;
  });

  const handleBookmarkPress = useCallback(() => {
    void bookmarkViewRef.current();
  }, []);

  const handleNavigateLeft = useCallback(() => {
    if (readingDirection === 'rtl') handlePrevChapter();
    else handleNextChapter();
  }, [readingDirection, handleNextChapter, handlePrevChapter]);

  const handleNavigateRight = useCallback(() => {
    if (readingDirection === 'rtl') handleNextChapter();
    else handlePrevChapter();
  }, [readingDirection, handleNextChapter, handlePrevChapter]);

  if (mangaLoading || pagesLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-white">Loading chapter...</Text>
      </View>
    );
  }

  if (pagesError) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-center text-white">{pagesError}</Text>
        <SourceWebsiteButton routeId={id} chapterId={activeChapterId} />
        <Pressable
          onPress={() =>
            setPagesErrorByChapter((current) => {
              if (!current[activeChapterId]) return current;
              const nextErrors = { ...current };
              delete nextErrors[activeChapterId];
              return nextErrors;
            })
          }
          className="mt-4"
        >
          <Text tone="primary">Try again</Text>
        </Pressable>
        <Pressable onPress={handleBack} className="mt-4">
          <Text tone="primary">Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!manga || !activeChapter || mangaError) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-white">Unable to load this chapter.</Text>
        <SourceWebsiteButton routeId={id} chapterId={chapterId} />
        <Pressable onPress={handleBack} className="mt-4">
          <Text tone="primary">Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'black' }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Header */}
      <Animated.View
        pointerEvents={overlayVisible ? 'box-none' : 'none'}
        accessibilityElementsHidden={!overlayVisible}
        importantForAccessibility={overlayVisible ? 'auto' : 'no-hide-descendants'}
        style={[
          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 },
          headerOverlayStyle,
        ]}
      >
        <MangaReaderHeader
          onBookmark={handleBookmarkPress}
          mangaTitle={manga.title}
          chapterTitle={activeChapter.title}
          onBack={handleBack}
          onToggleControls={handleToggleOptions}
          onOpenChapterList={openChapterPicker}
          onSetCover={setCurrentPageAsCover}
        />
      </Animated.View>

      {bookmarkNotice ? (
        <Text
          className="absolute bottom-20 left-4 right-4 z-30 rounded-xl bg-black/80 px-4 py-2 text-white"
          accessibilityLiveRegion="polite"
        >
          {bookmarkNotice}
        </Text>
      ) : null}
      {/* Reader Content */}
      <View
        style={{ marginTop: insets.top, marginBottom: insets.bottom }}
        ref={viewportRef}
        collapsable={false}
        className="flex-1"
      >
        {readingMode === 'vertical' ? (
          <VerticalReader
            key={(bookmark ?? 'webtoon-reader') + '-' + chapterId + '-' + readingMode}
            initialView={modeView}
            ref={verticalRef}
            chapters={chaptersToLoad}
            activeChapterId={activeChapterId}
            initialPage={currentPage}
            onPageChange={handlePageChange}
            onChapterChange={handleChapterChange}
            onTapScreen={toggleOverlay}
          />
        ) : (
          <HorizontalReader
            key={'page-reader-' + chapterId}
            initialView={modeView}
            ref={horizontalRef}
            pages={horizontalPages}
            activeChapterId={activeChapterId}
            direction={readingDirection}
            initialPage={currentPage}
            onPageChange={handlePageChange}
            onTapScreen={toggleOverlay}
            onNavigateLeft={handleNavigateLeft}
            onNavigateRight={handleNavigateRight}
          />
        )}
      </View>

      {/* Always-visible bottom bar + optional mode switcher */}
      <Animated.View
        pointerEvents={overlayVisible ? 'box-none' : 'none'}
        accessibilityElementsHidden={!overlayVisible}
        importantForAccessibility={overlayVisible ? 'auto' : 'no-hide-descendants'}
        style={[
          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 },
          controlsOverlayStyle,
        ]}
      >
        <MangaReaderControls
          currentPage={currentPage}
          totalPages={activeChapter.pageCount}
          mode={readingMode}
          direction={readingDirection}
          hasPrevChapter={Boolean(prevChapter)}
          hasNextChapter={Boolean(nextChapter)}
          showModeOptions={showModeOptions}
          onSelectMode={handleSelectMode}
          onSelectDirection={handleSelectDirection}
          onPrevPage={handlePrevPage}
          onNextPage={handleNextPage}
          onPrevChapter={handlePrevChapter}
          onNextChapter={handleNextChapter}
          onSeekPage={handleSeekPage}
        />
      </Animated.View>

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
        <ReaderPressable
          className="flex-1 justify-end bg-black/35"
          onPress={() => setShowChapterPicker(false)}
        >
          <ReaderPressable
            className="rounded-t-3xl bg-neutral-950 p-4 pb-8"
            onPress={() => undefined}
          >
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-white">Chapters</Text>
              <ReaderPressable
                onPress={() => setShowChapterPicker(false)}
                className="rounded-full bg-neutral-800 px-3 py-1"
              >
                <Text className="text-sm text-white">Close</Text>
              </ReaderPressable>
            </View>
            <ScrollView className="max-h-80">
              {chaptersToLoad.map((chapter) => (
                <ReaderPressable
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
                    <View className="ml-2 rounded border border-neutral-700 bg-neutral-800 px-1.5 py-0.5">
                      <Text className="text-[10px] font-bold text-neutral-400">
                        {chapter.language.toUpperCase()}
                      </Text>
                    </View>
                  ) : null}
                </ReaderPressable>
              ))}
            </ScrollView>
          </ReaderPressable>
        </ReaderPressable>
      </Modal>
    </GestureHandlerRootView>
  );
}

export default function ProtectedScreen() {
  return (
    <PrivacyAccessGate>
      <MangaReaderScreen />
    </PrivacyAccessGate>
  );
}
