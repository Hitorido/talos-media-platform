import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, ViewToken, useWindowDimensions } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { FittedPage } from './ZoomablePage';
import { useReaderZoom } from './useReaderZoom';

import type { MangaChapter, MangaPage } from '@/types/manga';

export type VerticalReaderRef = {
  getLocation: () =>
    | { chapterId: string; pageNumber: number; fraction: number; scale: number; pan: number }
    | undefined;
  scrollToPage: (pageNumber: number, animated?: boolean) => void;
  scrollToChapterPage: (chapterId: string, pageNumber: number) => void;
};

// Flat list items can be a page or a chapter-separator
type PageItem = {
  type: 'page';
  chapterId: string;
  chapterNumber: number;
  page: MangaPage;
};

type SeparatorItem = {
  type: 'separator';
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
};

type FlatItem = PageItem | SeparatorItem;

type VerticalReaderProps = {
  chapters: MangaChapter[];
  activeChapterId: string;
  initialPage?: number;
  initialView?: { fraction: number; scale: number; pan: number };
  onPageChange: (chapterId: string, pageNumber: number) => void;
  onChapterChange: (chapterId: string) => void;
  onTapScreen: () => void;
};

function buildFlatItems(chapters: MangaChapter[]): FlatItem[] {
  const items: FlatItem[] = [];
  for (const chapter of chapters) {
    items.push({
      type: 'separator',
      chapterId: chapter.id,
      chapterNumber: chapter.number,
      chapterTitle: chapter.title,
    });
    for (const page of chapter.pages) {
      items.push({
        type: 'page',
        chapterId: chapter.id,
        chapterNumber: chapter.number,
        page,
      });
    }
  }
  return items;
}

export const VerticalReader = memo(
  forwardRef<VerticalReaderRef, VerticalReaderProps>(
    (
      {
        chapters,
        activeChapterId,
        initialPage = 1,
        initialView,
        onPageChange,
        onChapterChange,
        onTapScreen,
      },
      ref,
    ) => {
      const [pinching, setPinching] = useState(false);
      const { width, height } = useWindowDimensions();
      const [viewportHeight, setViewportHeight] = useState(height - 100);
      const zoom = useReaderZoom(
        width,
        viewportHeight,
        onTapScreen,
        setPinching,
        undefined,
        initialView,
      );
      const flatListRef = zoom.scrollRef;
      const scrollRetryRef = useRef({ index: -1, attempts: 0 });
      const isReadyRef = useRef(false);
      const currentChapterRef = useRef(activeChapterId);
      const lastChapterSwitchRef = useRef<{ chapterId: string; at: number } | null>(null);
      const lastVisiblePageRef = useRef<{ chapterId: string; pageNumber: number } | null>(null);
      const flatItems = useMemo(() => buildFlatItems(chapters), [chapters]);
      const measured = useRef(new Map<string, number>());
      const restored = useRef(false);
      const restoreCallback = useRef<() => void>(() => {});
      const itemHeight = (item: FlatItem) =>
        item.type === 'separator'
          ? 0
          : (measured.current.get(item.chapterId + ':' + item.page.pageNumber) ??
            width / (item.page.aspectRatio || 0.67));
      const restoreView = () => {
        if (restored.current || !initialView) return;
        const target = flatItems[initialIndexRef.current];
        if (
          !target ||
          target.type !== 'page' ||
          !measured.current.has(target.chapterId + ':' + target.page.pageNumber)
        )
          return;
        restored.current = true;
        flatListRef.current?.scrollToIndex({
          index: initialIndexRef.current,
          animated: false,
          viewOffset: -itemHeight(target) * initialView.fraction,
        });
      };

      restoreCallback.current = restoreView;

      // Find the index of the initial page in the flat list
      const getInitialIndex = () => {
        const targetPage = Math.max(1, initialPage);
        let idx = flatItems.findIndex(
          (item) =>
            item.type === 'page' &&
            item.chapterId === activeChapterId &&
            item.page.pageNumber === targetPage,
        );
        // Fall back to chapter separator
        if (idx < 0) {
          idx = flatItems.findIndex(
            (item) => item.type === 'separator' && item.chapterId === activeChapterId,
          );
        }
        return Math.max(0, idx);
      };

      const initialIndex = getInitialIndex();
      const initialIndexRef = useRef(initialIndex);

      useImperativeHandle(ref, () => ({
        getLocation: () => {
          const offset = zoom.scrollY.value;
          let top = 0;
          for (const item of flatItems) {
            const length = itemHeight(item);
            if (item.type === 'page' && top + length > offset)
              return {
                chapterId: item.chapterId,
                pageNumber: item.page.pageNumber,
                fraction: Math.max(0, Math.min(1, (offset - top) / length)),
                scale: zoom.scale.value,
                pan: zoom.x.value / width,
              };
            top += length;
          }
        },
        scrollToPage: (pageNumber: number, animated = true) => {
          const idx = flatItems.findIndex(
            (item) =>
              item.type === 'page' &&
              item.chapterId === activeChapterId &&
              item.page.pageNumber === pageNumber,
          );
          if (idx >= 0) {
            flatListRef.current?.scrollToIndex({ index: idx, animated });
          }
        },
        scrollToChapterPage: (chapterId: string, pageNumber: number) => {
          const idx = flatItems.findIndex(
            (item) =>
              item.type === 'page' &&
              item.chapterId === chapterId &&
              item.page.pageNumber === pageNumber,
          );
          if (idx >= 0) {
            flatListRef.current?.scrollToIndex({ index: idx, animated: false });
          }
        },
      }));

      useEffect(() => {
        if (initialIndexRef.current > 0) {
          const timer = setTimeout(() => {
            if (!restored.current)
              flatListRef.current?.scrollToIndex({
                index: initialIndexRef.current,
                animated: false,
              });
            isReadyRef.current = true;
          }, 100);
          return () => clearTimeout(timer);
        } else {
          isReadyRef.current = true;
        }
      }, []);

      const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        const visiblePages = viewableItems
          .map((token) => token.item as FlatItem)
          .filter((item): item is PageItem => item.type === 'page');

        if (visiblePages.length === 0) return;

        const focusPage = visiblePages[Math.floor(visiblePages.length / 2)] ?? visiblePages[0];
        const focusIndex = focusPage.page.pageNumber;
        const now = Date.now();
        const previousVisible = lastVisiblePageRef.current;
        const isSameVisiblePage =
          previousVisible &&
          previousVisible.chapterId === focusPage.chapterId &&
          previousVisible.pageNumber === focusIndex;

        lastVisiblePageRef.current = { chapterId: focusPage.chapterId, pageNumber: focusIndex };

        if (isSameVisiblePage) return;

        const lastSwitch = lastChapterSwitchRef.current;
        const shouldSwitchChapter =
          focusPage.chapterId !== currentChapterRef.current &&
          (!lastSwitch ||
            lastSwitch.chapterId !== focusPage.chapterId ||
            now - lastSwitch.at > 900);

        if (shouldSwitchChapter) {
          currentChapterRef.current = focusPage.chapterId;
          lastChapterSwitchRef.current = { chapterId: focusPage.chapterId, at: now };
          onChapterChange(focusPage.chapterId);
        }
        onPageChange(focusPage.chapterId, focusIndex);
      }).current;

      const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 40 }).current;

      const renderItem = useCallback(
        ({ item }: { item: FlatItem }) => {
          if (item.type === 'separator') {
            return <View style={{ height: 0 }} />;
          }

          return (
            <FittedPage
              page={item.page}
              width={width}
              height={height - 100}
              scale={zoom.scale}
              x={zoom.x}
              onHeight={(value) => {
                measured.current.set(item.chapterId + ':' + item.page.pageNumber, value);
                setTimeout(() => restoreCallback.current(), 0);
              }}
            />
          );
        },
        [width, height, zoom.scale, zoom.x],
      );

      const keyExtractor = useCallback((item: FlatItem) => {
        if (item.type === 'separator') return `sep-${item.chapterId}`;
        return `page-${item.chapterId}-${item.page.pageNumber}`;
      }, []);

      return (
        <GestureDetector gesture={zoom.gesture}>
          <View
            onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
            style={{ flex: 1, overflow: 'hidden' }}
            collapsable={false}
          >
            <Animated.View style={zoom.viewportStyle}>
              <GestureDetector gesture={zoom.nativeGesture}>
                <Animated.FlatList
                  onScroll={zoom.scrollHandler}
                  onContentSizeChange={restoreView}
                  scrollEventThrottle={16}
                  scrollEnabled={!pinching}
                  // Longer coast after a throw-swipe; keep edges from rubber-banding mid-chapter.
                  decelerationRate={0.993}
                  bounces={!pinching}
                  overScrollMode={pinching ? 'never' : 'auto'}
                  ref={flatListRef}
                  data={flatItems}
                  keyExtractor={keyExtractor}
                  renderItem={renderItem}
                  onViewableItemsChanged={onViewableItemsChanged}
                  viewabilityConfig={viewabilityConfig}
                  showsVerticalScrollIndicator={false}
                  removeClippedSubviews={false}
                  initialNumToRender={8}
                  maxToRenderPerBatch={8}
                  windowSize={7}
                  className="flex-1 bg-black"
                  onScrollToIndexFailed={(info) => {
                    if (scrollRetryRef.current.index !== info.index)
                      scrollRetryRef.current = { index: info.index, attempts: 0 };
                    if (scrollRetryRef.current.attempts++ >= 3) return;
                    flatListRef.current?.scrollToOffset({
                      offset: info.averageItemLength * info.index,
                      animated: false,
                    });
                    setTimeout(() => {
                      flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
                      isReadyRef.current = true;
                    }, 150);
                  }}
                />
              </GestureDetector>
            </Animated.View>
          </View>
        </GestureDetector>
      );
    },
  ),
);

VerticalReader.displayName = 'VerticalReader';
