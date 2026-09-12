import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Dimensions, FlatList, Image, Pressable } from 'react-native';

import type { MangaPage, ReadingDirection } from '@/types/manga';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type HorizontalReaderRef = {
  scrollToPage: (pageNumber: number, animated?: boolean) => void;
  scrollToChapterPage: (chapterId: string, pageNumber: number) => void;
};

type HorizontalReaderProps = {
  pages: MangaPage[];
  activeChapterId: string;
  direction: ReadingDirection;
  initialPage?: number;
  onPageChange: (chapterId: string, pageNumber: number) => void;
  onTapScreen: () => void;
};

export const HorizontalReader = forwardRef<HorizontalReaderRef, HorizontalReaderProps>(
  ({ pages, activeChapterId, direction, initialPage = 1, onPageChange, onTapScreen }, ref) => {
    const flatListRef = useRef<FlatList<MangaPage>>(null);
    const isInitializedRef = useRef(false);
    const lastPageRef = useRef<{ chapterId: string; pageNumber: number } | null>(null);
    const onPageChangeRef = useRef(onPageChange);
    onPageChangeRef.current = onPageChange;

    // In RTL reading mode, pages are ordered from right to left
    const displayPages = direction === 'rtl' ? [...pages].reverse() : pages;

    const getPageIndex = (chapterId: string, pageNumber: number) => {
      const pageIndex = displayPages.findIndex(
        (p) => p.chapterId === chapterId && p.pageNumber === pageNumber,
      );
      return pageIndex >= 0 ? pageIndex : 0;
    };

    const initialIndex = Math.max(0, getPageIndex(activeChapterId, initialPage));
    const initialIndexRef = useRef(initialIndex);
    const initialPageRef = useRef(initialPage);
    const previousDirectionRef = useRef(direction);
    const activeChapterIdRef = useRef(activeChapterId);
    const currentPageRef = useRef(initialPage);
    activeChapterIdRef.current = activeChapterId;
    currentPageRef.current = initialPage;

    useEffect(() => {
      if (initialPageRef.current > 1 && flatListRef.current) {
        const timer = setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: initialIndexRef.current, animated: false });
          isInitializedRef.current = true;
        }, 80);
        return () => clearTimeout(timer);
      } else {
        isInitializedRef.current = true;
      }
    }, []);

    useImperativeHandle(ref, () => ({
      scrollToPage: (pageNumber: number, animated = true) => {
        const index = getPageIndex(activeChapterId, pageNumber);
        if (index >= 0 && index < displayPages.length) {
          flatListRef.current?.scrollToIndex({ index, animated });
        }
      },
      scrollToChapterPage: (chapterId: string, pageNumber: number) => {
        const index = getPageIndex(chapterId, pageNumber);
        flatListRef.current?.scrollToIndex({ index, animated: false });
      },
    }));

    // Direction changes deliberately reposition once; page updates must not retrigger it.
    useEffect(() => {
      if (previousDirectionRef.current !== direction) {
        previousDirectionRef.current = direction;
        const index = displayPages.findIndex(
          (page) =>
            page.chapterId === activeChapterIdRef.current &&
            page.pageNumber === currentPageRef.current,
        );
        flatListRef.current?.scrollToIndex({ index, animated: false });
      }
    }, [direction, displayPages]);

    const reportSettledPage = (index: number) => {
      const current = displayPages[Math.max(0, Math.min(index, displayPages.length - 1))];
      if (!current || typeof current.pageNumber !== 'number') return;

      const chapterId = current.chapterId ?? '';
      const pageNumber = current.pageNumber;
      const previous = lastPageRef.current;

      if (!previous || previous.chapterId !== chapterId || previous.pageNumber !== pageNumber) {
        lastPageRef.current = { chapterId, pageNumber };
        onPageChangeRef.current(chapterId, pageNumber);
      }
    };

    const reportFromOffset = (offsetX: number) => {
      reportSettledPage(Math.round(offsetX / SCREEN_WIDTH));
    };

    return (
      <FlatList
        ref={flatListRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={displayPages}
        keyExtractor={(item) => `h-page-${item.chapterId ?? 'unknown'}-${item.pageNumber}`}
        initialScrollIndex={
          initialIndex >= 0 && initialIndex < displayPages.length ? initialIndex : 0
        }
        scrollEventThrottle={16}
        onScroll={({ nativeEvent }) => {
          reportFromOffset(nativeEvent.contentOffset.x);
        }}
        onMomentumScrollEnd={({ nativeEvent }) => {
          reportFromOffset(nativeEvent.contentOffset.x);
        }}
        className="flex-1 bg-black"
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
            isInitializedRef.current = true;
          }, 100);
        }}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        renderItem={({ item }) => (
          <Pressable
            onPress={onTapScreen}
            style={{ width: SCREEN_WIDTH }}
            className="relative flex-1 items-center justify-center bg-black"
          >
            <Image source={{ uri: item.imageUrl }} className="h-full w-full" resizeMode="contain" />
          </Pressable>
        )}
      />
    );
  },
);

HorizontalReader.displayName = 'HorizontalReader';
