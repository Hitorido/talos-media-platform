import { FittedPage } from './ZoomablePage';
import { useReaderZoom } from './useReaderZoom';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState, useRef } from 'react';
import { FlatList, View, ViewToken, useWindowDimensions } from 'react-native';

import type { MangaChapter, MangaPage } from '@/types/manga';


export type VerticalReaderRef = {
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

export const VerticalReader = forwardRef<VerticalReaderRef, VerticalReaderProps>(
  (
    { chapters, activeChapterId, initialPage = 1, onPageChange, onChapterChange, onTapScreen },
    ref,
  ) => {
    const [pinching,setPinching]=useState(false);
    const {width,height}=useWindowDimensions();
    const zoom=useReaderZoom(width,height-100,onTapScreen,setPinching);
    const flatListRef = zoom.scrollRef;
    const scrollRetryRef = useRef({index:-1,attempts:0});
    const isReadyRef = useRef(false);
    const currentChapterRef = useRef(activeChapterId);
    const lastChapterSwitchRef = useRef<{ chapterId: string; at: number } | null>(null);
    const lastVisiblePageRef = useRef<{ chapterId: string; pageNumber: number } | null>(null);
    const flatItems = buildFlatItems(chapters);

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
          flatListRef.current?.scrollToIndex({ index: initialIndexRef.current, animated: false });
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
        (!lastSwitch || lastSwitch.chapterId !== focusPage.chapterId || now - lastSwitch.at > 900);

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
          return <View style={{height:0}} />;
        }

        return <FittedPage page={item.page} width={width} height={height-100} scale={zoom.scale} x={zoom.x} />;
      },
      [width,height,zoom.scale,zoom.x],
    );

    const keyExtractor = useCallback((item: FlatItem) => {
      if (item.type === 'separator') return `sep-${item.chapterId}`;
      return `page-${item.chapterId}-${item.page.pageNumber}`;
    }, []);

    return (
      <GestureDetector gesture={zoom.gesture}><Animated.FlatList
        onScroll={zoom.scrollHandler}
        scrollEventThrottle={16}
        scrollEnabled={!pinching}
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
          if (scrollRetryRef.current.index !== info.index) scrollRetryRef.current={index:info.index,attempts:0};
          if (scrollRetryRef.current.attempts++ >= 3) return;
          flatListRef.current?.scrollToOffset({offset:info.averageItemLength*info.index,animated:false});
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
            isReadyRef.current = true;
          }, 150);
        }}
      /></GestureDetector>
    );
  },
);

VerticalReader.displayName = 'VerticalReader';
