import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import type { ReadingDirection, ReadingMode } from '@/types/manga';
import { cn } from '@/utils/cn';
import { ReaderPressable } from './ReaderPressable';

type MangaReaderControlsProps = {
  currentPage: number;
  totalPages: number;
  mode: ReadingMode;
  direction: ReadingDirection;
  hasPrevChapter: boolean;
  hasNextChapter: boolean;
  showModeOptions: boolean;
  onSelectMode: (mode: ReadingMode) => void;
  onSelectDirection: (direction: ReadingDirection) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onSeekPage: (page: number, animated?: boolean) => void;
};

/**
 * Seek markers are static for the lifetime of a drag. Keeping them in their own
 * memoized component means a drag never reconciles hundreds of marker views.
 */
const SeekMarkers = memo(function SeekMarkers({
  pageMarkers,
  totalPages,
}: {
  pageMarkers: number[];
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  return (
    <>
      {pageMarkers.map((pageProgress, index) => (
        <View
          key={index}
          pointerEvents="none"
          className="absolute top-[2.5px] h-[3px] w-[3px] rounded-full bg-neutral-400"
          style={{ left: `${(pageProgress / (totalPages - 1)) * 100}%`, marginLeft: -1.5 }}
        />
      ))}
    </>
  );
});

/**
 * The dragging thumb/fill are driven straight from shared values on the UI thread
 * (immediate). The numeric bubble is decorative, so it is throttled on the JS side
 * to avoid queueing a React update for every page crossed during a long drag — that
 * queue was what made the commit on release feel late.
 */
const PREVIEW_THROTTLE_MS = 50;

function MangaReaderControlsImpl({
  currentPage,
  totalPages,
  mode,
  direction,
  hasPrevChapter,
  hasNextChapter,
  showModeOptions,
  onSelectMode,
  onSelectDirection,
  onPrevPage,
  onNextPage,
  onPrevChapter,
  onNextChapter,
  onSeekPage,
}: MangaReaderControlsProps) {
  const insets = useSafeAreaInsets();
  const [progressWidth, setProgressWidth] = useState(0);
  const [previewPage, setPreviewPage] = useState(currentPage);
  const progressDirection = mode === 'horizontal' ? direction : 'rtl';
  const progress = totalPages > 1 ? (currentPage - 1) / (totalPages - 1) : 0;
  const boundedProgress = Math.max(0, Math.min(1, progress));
  const progressValue = useSharedValue(boundedProgress);
  const draggingValue = useSharedValue(false);
  const lastPageValue = useSharedValue(currentPage);
  const lastPreviewAt = useSharedValue(0);
  const onSeekPageRef = useRef(onSeekPage);
  const previewThrottleRef = useRef(0);
  const markerCount = Math.min(totalPages, Math.max(2, Math.floor(progressWidth / 6)));
  const pageMarkers = useMemo(
    () =>
      Array.from(
        { length: totalPages > 1 ? markerCount : 0 },
        (_, index) => (index / (markerCount - 1)) * (totalPages - 1),
      ),
    [markerCount, totalPages],
  );

  useEffect(() => {
    onSeekPageRef.current = onSeekPage;
  }, [onSeekPage]);

  useEffect(() => {
    if (!draggingValue.value) progressValue.value = boundedProgress;
  }, [boundedProgress, draggingValue, progressValue]);

  // Throttled so a long drag cannot queue a React update per page crossed.
  const showPagePreview = useCallback((page: number) => {
    const now = Date.now();
    if (now - previewThrottleRef.current < PREVIEW_THROTTLE_MS) return;
    previewThrottleRef.current = now;
    setPreviewPage(page);
  }, []);

  const commitPage = useCallback((page: number) => {
    onSeekPageRef.current(page, false);
  }, []);

  const seekGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        // Gesture callbacks are worklets; shared values are intentionally mutated on the UI thread.

        .onBegin((event) => {
          if (progressWidth <= 0 || totalPages <= 0) return;
          const visualProgress = Math.max(0, Math.min(1, event.x / progressWidth));
          const logicalProgress = progressDirection === 'rtl' ? 1 - visualProgress : visualProgress;
          const page = Math.round(logicalProgress * (totalPages - 1)) + 1;
          // eslint-disable-next-line react-hooks/immutability
          progressValue.value = logicalProgress;
          // eslint-disable-next-line react-hooks/immutability
          lastPageValue.value = page;
          // eslint-disable-next-line react-hooks/immutability
          draggingValue.value = true;
          runOnJS(setPreviewPage)(page);
        })
        // eslint-disable-next-line react-hooks/refs
        .onUpdate((event) => {
          if (progressWidth <= 0 || totalPages <= 0) return;
          const visualProgress = Math.max(0, Math.min(1, event.x / progressWidth));
          const logicalProgress = progressDirection === 'rtl' ? 1 - visualProgress : visualProgress;
          const page = Math.round(logicalProgress * (totalPages - 1)) + 1;
          // eslint-disable-next-line react-hooks/immutability
          progressValue.value = logicalProgress;
          if (page !== lastPageValue.value) {
            // eslint-disable-next-line react-hooks/immutability
            lastPageValue.value = page;
            const now = Date.now();
            if (now - lastPreviewAt.value >= PREVIEW_THROTTLE_MS) {
              lastPreviewAt.value = now;
              runOnJS(showPagePreview)(page);
            }
          }
        })
        // eslint-disable-next-line react-hooks/refs
        .onEnd((_event, success) => {
          if (success && draggingValue.value && lastPageValue.value > 0) {
            runOnJS(setPreviewPage)(lastPageValue.value);
            runOnJS(commitPage)(lastPageValue.value);
          }
          // eslint-disable-next-line react-hooks/immutability
          draggingValue.value = false;
        })
        .onFinalize(() => {
          // eslint-disable-next-line react-hooks/immutability
          draggingValue.value = false;
        }),
    [
      commitPage,
      draggingValue,
      lastPageValue,
      lastPreviewAt,
      progressDirection,
      progressValue,
      progressWidth,
      showPagePreview,
      totalPages,
    ],
  );

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
    ...(progressDirection === 'rtl' ? { right: 0 } : { left: 0 }),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    ...(progressDirection === 'rtl'
      ? { right: `${progressValue.value * 100}%` }
      : { left: `${progressValue.value * 100}%` }),
    transform: [{ translateX: progressDirection === 'rtl' ? 10 : -10 }],
  }));
  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: draggingValue.value ? 1 : 0,
    ...(progressDirection === 'rtl'
      ? { right: `${progressValue.value * 100}%` }
      : { left: `${progressValue.value * 100}%` }),
    transform: [
      { translateX: progressDirection === 'rtl' ? 14 : -14 },
      { scale: draggingValue.value ? 1 : 0.85 },
    ],
  }));

  return (
    <View
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      className="absolute bottom-0 left-0 right-0 z-20 bg-black/90 px-4 pt-3"
    >
      {showModeOptions ? (
        <View className="mb-3 flex-row items-center justify-between gap-1 border-b border-neutral-800 pb-3">
          {mode === 'horizontal' ? (
            <View className="flex-row items-center gap-1">
              <ReaderPressable
                onPress={onPrevPage}
                disabled={currentPage <= 1}
                className={cn(
                  'rounded-lg bg-neutral-800 px-2 py-1',
                  currentPage <= 1 && 'opacity-40',
                )}
              >
                <Text className="text-xs font-semibold text-white">‹</Text>
              </ReaderPressable>
              <Text className="text-xs text-neutral-400">
                {currentPage}/{totalPages}
              </Text>
              <ReaderPressable
                onPress={onNextPage}
                disabled={currentPage >= totalPages}
                className={cn(
                  'rounded-lg bg-neutral-800 px-2 py-1',
                  currentPage >= totalPages && 'opacity-40',
                )}
              >
                <Text className="text-xs font-semibold text-white">›</Text>
              </ReaderPressable>
            </View>
          ) : (
            <View className="items-center justify-center">
              <Text className="text-xs text-neutral-500">
                Ch. {currentPage > 0 ? currentPage : '—'} · {totalPages} pages
              </Text>
            </View>
          )}

          <View className="flex-row items-center gap-2">
            <View className="flex-row rounded-lg bg-neutral-900 p-1">
              <ReaderPressable
                onPress={() => onSelectMode('vertical')}
                className={cn(
                  'rounded-md px-2.5 py-1',
                  mode === 'vertical' ? 'bg-primary-600' : 'bg-transparent',
                )}
              >
                <Text className="text-xs font-medium text-white">Webtoon</Text>
              </ReaderPressable>
              <ReaderPressable
                onPress={() => onSelectMode('horizontal')}
                className={cn(
                  'rounded-md px-2.5 py-1',
                  mode === 'horizontal' ? 'bg-primary-600' : 'bg-transparent',
                )}
              >
                <Text className="text-xs font-medium text-white">Manga</Text>
              </ReaderPressable>
            </View>

            {mode === 'horizontal' ? (
              <View className="flex-row rounded-lg bg-neutral-900 p-0.5">
                <ReaderPressable
                  onPress={() => onSelectDirection('rtl')}
                  className={cn(
                    'rounded-md px-1.5 py-0.5',
                    direction === 'rtl' ? 'bg-primary-600' : 'bg-transparent',
                  )}
                >
                  <Text className="text-[10px] text-white">RTL</Text>
                </ReaderPressable>
                <ReaderPressable
                  onPress={() => onSelectDirection('ltr')}
                  className={cn(
                    'rounded-md px-1.5 py-0.5',
                    direction === 'ltr' ? 'bg-primary-600' : 'bg-transparent',
                  )}
                >
                  <Text className="text-[10px] text-white">LTR</Text>
                </ReaderPressable>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <View className="mb-3 h-10 px-1">
        <GestureDetector gesture={seekGesture}>
          <View
            hitSlop={{ top: 15, bottom: 15 }}
            className="absolute left-1 right-1 top-[15px] h-2 rounded-full bg-neutral-800"
            onLayout={(event) => setProgressWidth(event.nativeEvent.layout.width)}
          >
            <SeekMarkers pageMarkers={pageMarkers} totalPages={totalPages} />
            <Animated.View
              pointerEvents="none"
              className="absolute h-full rounded-full bg-primary-500/25"
              style={fillStyle}
            />
            <Animated.View
              pointerEvents="none"
              className="absolute -top-1.5 h-5 w-5 rounded-full border-2 border-white bg-primary-500 shadow"
              style={thumbStyle}
            />
            <Animated.View
              pointerEvents="none"
              className="absolute -top-[19px] min-w-7 items-center rounded-full bg-primary-500 px-1 py-1"
              style={bubbleStyle}
            >
              <Text className="text-[9px] font-bold text-white">{previewPage}</Text>
            </Animated.View>
          </View>
        </GestureDetector>
      </View>

      <View className="flex-row items-center justify-between">
        <ReaderPressable
          onPress={onPrevChapter}
          disabled={!hasPrevChapter}
          className={cn(
            'mr-2 flex-1 items-center rounded-lg border border-neutral-700 bg-neutral-900 py-2',
            !hasPrevChapter && 'opacity-40',
          )}
        >
          <Text className="text-xs font-semibold text-white">« Prev Chapter</Text>
        </ReaderPressable>
        <ReaderPressable
          onPress={onNextChapter}
          disabled={!hasNextChapter}
          className={cn(
            'ml-2 flex-1 items-center rounded-lg border border-neutral-700 bg-neutral-900 py-2',
            !hasNextChapter && 'opacity-40',
          )}
        >
          <Text className="text-xs font-semibold text-white">Next Chapter »</Text>
        </ReaderPressable>
      </View>
    </View>
  );
}

export const MangaReaderControls = memo(MangaReaderControlsImpl);
