import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FlatList, useWindowDimensions } from 'react-native';
import { ZoomablePage } from './ZoomablePage';

import type { MangaPage, ReadingDirection } from '@/types/manga';

export type HorizontalReaderRef = {
  getLocation: () =>
    | { chapterId: string; pageNumber: number; fraction: number; scale: number; pan: number }
    | undefined;
  scrollToPage: (pageNumber: number, animated?: boolean) => void;
  scrollToChapterPage: (chapterId: string, pageNumber: number) => void;
};

type HorizontalReaderProps = {
  pages: MangaPage[];
  activeChapterId: string;
  direction: ReadingDirection;
  initialPage?: number;
  initialView?: { fraction: number; scale: number; pan: number };
  onPageChange: (chapterId: string, pageNumber: number) => void;
  onTapScreen: () => void;
  onNavigateLeft?: () => void;
  onNavigateRight?: () => void;
};

type LocationReader = () => { fraction: number; scale: number; pan: number };
const HorizontalPage = memo(function HorizontalPage({
  page,
  locations,
  ...props
}: Omit<React.ComponentProps<typeof ZoomablePage>, 'onLocationReady'> & {
  locations: Map<string, LocationReader>;
}) {
  const locationKey = `${page.chapterId}:${page.pageNumber}`;
  const onLocationReady = useCallback(
    (read: LocationReader) => {
      locations.set(locationKey, read);
    },
    [locations, locationKey],
  );
  return <ZoomablePage {...props} page={page} onLocationReady={onLocationReady} />;
});

export const HorizontalReader = memo(
  forwardRef<HorizontalReaderRef, HorizontalReaderProps>(
    (
      {
        pages,
        activeChapterId,
        direction,
        initialPage = 1,
        initialView,
        onPageChange,
        onTapScreen,
        onNavigateLeft,
        onNavigateRight,
      },
      ref,
    ) => {
      const { width: SCREEN_WIDTH } = useWindowDimensions();
      const [viewportHeight, setViewportHeight] = useState<number>();
      const locations = useRef(
        new Map<string, () => { fraction: number; scale: number; pan: number }>(),
      );
      const [pinching, setPinching] = useState(false);
      const flatListRef = useRef<FlatList<MangaPage>>(null);

      const lastPageRef = useRef<{ chapterId: string; pageNumber: number } | null>(null);
      const onPageChangeRef = useRef(onPageChange);
      onPageChangeRef.current = onPageChange;

      // In RTL reading mode, pages are ordered from right to left
      const displayPages = useMemo(
        () => (direction === 'rtl' ? [...pages].reverse() : pages),
        [direction, pages],
      );

      const getPageIndex = (chapterId: string, pageNumber: number) => {
        const exact = displayPages.findIndex(
          (p) => p.chapterId === chapterId && p.pageNumber === pageNumber,
        );
        if (exact >= 0) return exact;
        // Missing page falls back to the chapter's start; a chapter that has no
        // loaded pages at all returns -1 so callers skip the scroll.
        return displayPages.findIndex((p) => p.chapterId === chapterId);
      };

      const initialIndex = Math.max(0, getPageIndex(activeChapterId, initialPage));
      const pendingTarget = useRef<{ chapterId: string; pageNumber: number } | null>({
        chapterId: activeChapterId,
        pageNumber: initialPage,
      });
      useLayoutEffect(() => {
        const target = pendingTarget.current ??
          lastPageRef.current ?? {
            chapterId: activeChapterIdRef.current,
            pageNumber: currentPageRef.current,
          };
        pendingTarget.current = target;
        const index = displayPages.findIndex(
          (page) => page.chapterId === target.chapterId && page.pageNumber === target.pageNumber,
        );
        if (index >= 0)
          flatListRef.current?.scrollToOffset({ offset: index * SCREEN_WIDTH, animated: false });
      }, [displayPages, SCREEN_WIDTH]);

      const mountIndex = useRef(initialIndex);
      const initialViewTarget = useRef({ chapterId: activeChapterId, pageNumber: initialPage });

      const previousDirectionRef = useRef(direction);
      const activeChapterIdRef = useRef(activeChapterId);
      const currentPageRef = useRef(initialPage);
      activeChapterIdRef.current = activeChapterId;
      currentPageRef.current = initialPage;

      useImperativeHandle(ref, () => ({
        getLocation: () => {
          const current = lastPageRef.current ?? {
            chapterId: activeChapterId,
            pageNumber: initialPage,
          };
          const location = locations.current.get(current.chapterId + ':' + current.pageNumber)?.();
          return location ? { ...current, ...location } : undefined;
        },
        scrollToPage: (pageNumber: number, animated = true) => {
          pendingTarget.current = { chapterId: activeChapterId, pageNumber };
          const index = getPageIndex(activeChapterId, pageNumber);
          if (index >= 0 && index < displayPages.length) {
            flatListRef.current?.scrollToIndex({ index, animated });
          }
        },
        scrollToChapterPage: (chapterId: string, pageNumber: number) => {
          pendingTarget.current = { chapterId, pageNumber };
          const index = getPageIndex(chapterId, pageNumber);
          if (index >= 0 && index < displayPages.length) {
            flatListRef.current?.scrollToIndex({ index, animated: false });
          }
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
          if (index >= 0) flatListRef.current?.scrollToIndex({ index, animated: false });
        }
      }, [direction, displayPages]);

      const reportSettledPage = (index: number) => {
        const current = displayPages[Math.max(0, Math.min(index, displayPages.length - 1))];
        if (!current || typeof current.pageNumber !== 'number') return;

        const chapterId = current.chapterId ?? '';
        const pageNumber = current.pageNumber;
        const target = pendingTarget.current;
        if (target && (target.chapterId !== chapterId || target.pageNumber !== pageNumber)) return;
        pendingTarget.current = null;
        const previous = lastPageRef.current;

        if (!previous || previous.chapterId !== chapterId || previous.pageNumber !== pageNumber) {
          lastPageRef.current = { chapterId, pageNumber };
          onPageChangeRef.current(chapterId, pageNumber);
        }
      };

      const reportFromOffset = (offsetX: number) => {
        reportSettledPage(Math.round(offsetX / SCREEN_WIDTH));
      };

      const renderItem = useCallback(
        ({ item }: { item: MangaPage }) => (
          <HorizontalPage
            viewportHeight={viewportHeight}
            initialView={
              item.chapterId === initialViewTarget.current.chapterId &&
              item.pageNumber === initialViewTarget.current.pageNumber
                ? initialView
                : undefined
            }
            locations={locations.current}
            onGestureActive={setPinching}
            page={item}
            onTapScreen={onTapScreen}
            onNavigateLeft={onNavigateLeft}
            onNavigateRight={onNavigateRight}
            paged
          />
        ),
        [viewportHeight, initialView, onTapScreen, onNavigateLeft, onNavigateRight],
      );

      return (
        <FlatList
          onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
          scrollEnabled={!pinching}
          ref={flatListRef}
          horizontal
          // snapToInterval + fast deceleration gives a "thrown" page fling that coasts into the next page
          pagingEnabled={false}
          snapToInterval={SCREEN_WIDTH}
          snapToAlignment="start"
          disableIntervalMomentum={false}
          decelerationRate="fast"
          disableScrollViewPanResponder={false}
          showsHorizontalScrollIndicator={false}
          data={displayPages}
          keyExtractor={(item) => `h-page-${item.chapterId ?? 'unknown'}-${item.pageNumber}`}
          initialScrollIndex={mountIndex.current}
          scrollEventThrottle={16}
          onScroll={({ nativeEvent }) => {
            reportFromOffset(nativeEvent.contentOffset.x);
          }}
          onMomentumScrollEnd={({ nativeEvent }) => {
            reportFromOffset(nativeEvent.contentOffset.x);
          }}
          className="flex-1 bg-black"
          onScrollBeginDrag={() => {
            pendingTarget.current = null;
          }}
          initialNumToRender={5}
          maxToRenderPerBatch={3}
          windowSize={7}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          renderItem={renderItem}
        />
      );
    },
  ),
);

HorizontalReader.displayName = 'HorizontalReader';
