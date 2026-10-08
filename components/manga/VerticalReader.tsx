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
import { View, type ViewToken, useWindowDimensions } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { FittedPage } from './ZoomablePage';
import { useReaderZoom } from './useReaderZoom';
import { getPageRatio } from '@/services/mangaImageCache';
import type { MangaChapter, MangaPage } from '@/types/manga';

type Location = {
  chapterId: string;
  pageNumber: number;
  fraction: number;
  scale: number;
  pan: number;
};
export type VerticalReaderRef = {
  getLocation: () => Location | undefined;
  scrollToPage: (pageNumber: number, animated?: boolean) => void;
  scrollToChapterPage: (chapterId: string, pageNumber: number) => void;
};
type Props = {
  chapters: MangaChapter[];
  activeChapterId: string;
  initialPage?: number;
  initialView?: { fraction: number; scale: number; pan: number };
  onPageChange: (chapterId: string, pageNumber: number) => void;
  onChapterChange: (chapterId: string) => void;
  onTapScreen: () => void;
};
type Row = MangaPage & { chapterId: string };
const rowKey = (row: Row) => `${row.chapterId}:${row.pageNumber}`;
const PageRow = memo(function PageRow({
  page,
  width,
  height,
  scale,
  x,
  onMeasure,
}: {
  page: Row;
  width: number;
  height: number;
  scale: ReturnType<typeof useReaderZoom>['scale'];
  x: ReturnType<typeof useReaderZoom>['x'];
  onMeasure: (url: string, ratio: number) => void;
}) {
  const onHeight = useCallback(
    (value: number) => onMeasure(page.imageUrl, width / value),
    [page.imageUrl, width, onMeasure],
  );
  return (
    <FittedPage page={page} width={width} height={height} scale={scale} x={x} onHeight={onHeight} />
  );
});

/** One zoom surface, with chapter/page identity retained when neighboring pages arrive. */
export const VerticalReader = memo(
  forwardRef<VerticalReaderRef, Props>(function VerticalReader(
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
  ) {
    const { width, height } = useWindowDimensions();
    const [viewportHeight, setViewportHeight] = useState(height - 100);
    const [pinching, setPinching] = useState(false);
    const [revision, setRevision] = useState(0);
    const measured = useRef(new Map<string, number>());
    const zoom = useReaderZoom(
      width,
      viewportHeight,
      onTapScreen,
      setPinching,
      undefined,
      initialView,
    );
    const rows = useMemo<Row[]>(
      () =>
        chapters.flatMap((chapter) =>
          chapter.pages.map((page) => ({ ...page, chapterId: chapter.id })),
        ),
      [chapters],
    );
    const key = rowKey;
    const target = useRef({
      chapterId: activeChapterId,
      pageNumber: initialPage,
      fraction: initialView?.fraction ?? 0,
    });
    const pending = useRef(true);
    const layouts = useMemo(() => {
      void revision; // Invalidates cached offsets after a batch of decoded dimensions.
      let offset = 0;
      return rows.map((row, index) => {
        const length =
          width /
          (measured.current.get(row.imageUrl) ??
            getPageRatio(row.imageUrl, row.aspectRatio || 0.67));
        const layout = { index, length, offset };
        offset += length;
        return layout;
      });
    }, [rows, width, revision]);
    const latest = useRef({ rows, layouts, activeChapterId, onPageChange, onChapterChange });
    latest.current = { rows, layouts, activeChapterId, onPageChange, onChapterChange };
    const previousGeometry = useRef({ rows, layouts });
    const locationAtOffset = useCallback(
      (snapshot: { rows: Row[]; layouts: { offset: number; length: number }[] }) => {
        const offset = zoom.scrollY.value;
        const index = snapshot.layouts.findIndex(
          (layout) => layout.offset + layout.length > offset + 0.5,
        );
        const row = snapshot.rows[index];
        const layout = snapshot.layouts[index];
        return row && layout
          ? {
              chapterId: row.chapterId,
              pageNumber: row.pageNumber,
              fraction: Math.max(0, Math.min(1, (offset - layout.offset) / layout.length)),
            }
          : target.current;
      },
      [zoom.scrollY],
    );
    const position = useCallback(
      (chapterId: string, pageNumber: number, animated = false, fraction = 0) => {
        target.current = { chapterId, pageNumber, fraction };
        pending.current = true;
        const index = latest.current.rows.findIndex(
          (row) => row.chapterId === chapterId && row.pageNumber === pageNumber,
        );
        if (index < 0) return;
        const layout = latest.current.layouts[index];
        zoom.scrollRef.current?.scrollToOffset({
          offset: layout.offset + layout.length * fraction,
          animated,
        });
      },
      [zoom.scrollRef],
    );
    useLayoutEffect(() => {
      const location = pending.current
        ? target.current
        : locationAtOffset(previousGeometry.current);
      previousGeometry.current = { rows, layouts };
      position(location.chapterId, location.pageNumber, false, location.fraction);
    }, [layouts, rows, position, locationAtOffset]);
    useImperativeHandle(ref, () => ({
      getLocation: () => ({
        ...(pending.current ? target.current : locationAtOffset(latest.current)),
        scale: zoom.scale.value,
        pan: zoom.x.value / width,
      }),
      scrollToPage: (pageNumber, animated = false) =>
        position(activeChapterId, pageNumber, animated),
      scrollToChapterPage: (chapterId, pageNumber) => position(chapterId, pageNumber),
    }));
    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const visible = viewableItems
        .filter((token) => token.isViewable)
        .map((token) => token.item as Row);
      if (!visible.length) return;
      if (pending.current) {
        if (
          !visible.some(
            (row) => key(row) === `${target.current.chapterId}:${target.current.pageNumber}`,
          )
        )
          return;
        pending.current = false;
        return;
      }
      const row = visible[0];
      const previous = target.current;
      const index = latest.current.rows.findIndex((item) => key(item) === key(row));
      const layout = latest.current.layouts[index];
      const fraction = layout
        ? Math.max(0, Math.min(1, (zoom.scrollY.value - layout.offset) / layout.length))
        : 0;
      target.current = { chapterId: row.chapterId, pageNumber: row.pageNumber, fraction };
      if (previous.chapterId === row.chapterId && previous.pageNumber === row.pageNumber) return;
      if (previous.chapterId !== row.chapterId) latest.current.onChapterChange(row.chapterId);
      latest.current.onPageChange(row.chapterId, row.pageNumber);
    }).current;
    const measureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(
      () => () => {
        if (measureTimer.current) clearTimeout(measureTimer.current);
      },
      [],
    );
    const onMeasure = useCallback((url: string, ratio: number) => {
      if (Math.abs((measured.current.get(url) ?? 0) - ratio) < 0.00001) return;
      measured.current.set(url, ratio);
      if (measureTimer.current) return;
      measureTimer.current = setTimeout(() => {
        measureTimer.current = null;
        setRevision((value) => value + 1);
      }, 16);
    }, []);
    const { scale, x } = zoom;
    const renderItem = useCallback(
      ({ item }: { item: Row }) => (
        <PageRow
          page={item}
          width={width}
          height={viewportHeight}
          scale={scale}
          x={x}
          onMeasure={onMeasure}
        />
      ),
      [width, viewportHeight, scale, x, onMeasure],
    );
    const getItemLayout = useCallback(
      (_: unknown, index: number) => layouts[index] ?? { index, length: 0, offset: 0 },
      [layouts],
    );
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
                ref={zoom.scrollRef}
                data={rows}
                keyExtractor={key}
                onScroll={zoom.scrollHandler}
                scrollEventThrottle={16}
                onScrollBeginDrag={() => {
                  pending.current = false;
                }}
                onContentSizeChange={() => {
                  if (pending.current) {
                    const at = target.current;
                    position(at.chapterId, at.pageNumber, false, at.fraction);
                  }
                }}
                getItemLayout={getItemLayout}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={useRef({ itemVisiblePercentThreshold: 1 }).current}
                scrollEnabled={!pinching}
                removeClippedSubviews={false}
                initialNumToRender={8}
                maxToRenderPerBatch={4}
                windowSize={7}
                showsVerticalScrollIndicator={false}
                className="flex-1 bg-black"
                renderItem={renderItem}
              />
            </GestureDetector>
          </Animated.View>
        </View>
      </GestureDetector>
    );
  }),
);
