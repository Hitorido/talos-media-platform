import { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import type { ReadingDirection, ReadingMode } from '@/types/manga';
import { cn } from '@/utils/cn';

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

type ProgressGestureModel = {
  width: number;
  totalPages: number;
  direction: ReadingDirection;
  startProgress: number;
  lastPage: number;
  seekPage: (page: number) => void;
  settlePage: (page: number) => void;
};

function createProgressResponder(
  gestureModelRef: { current: ProgressGestureModel },
  seekFromProgress: (progress: number) => void,
) {
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: (event) => {
      const gestureModel = gestureModelRef.current;
      if (!gestureModel.width) return;
      gestureModel.lastPage = 0;
      gestureModel.startProgress = Math.max(
        0,
        Math.min(1, event.nativeEvent.locationX / gestureModel.width),
      );
      seekFromProgress(gestureModel.startProgress);
    },
    onPanResponderMove: (_event, gestureState) => {
      const gestureModel = gestureModelRef.current;
      if (!gestureModel.width) return;
      const rawProgress = Math.max(
        0,
        Math.min(1, gestureModel.startProgress + gestureState.dx / gestureModel.width),
      );
      seekFromProgress(rawProgress);
    },
    onPanResponderRelease: () => {
      const gestureModel = gestureModelRef.current;
      if (gestureModel.lastPage > 0) {
        gestureModel.settlePage(gestureModel.lastPage);
      }
    },
  });
}

export function MangaReaderControls({
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
  const progressDirection = mode === 'horizontal' ? direction : 'rtl';
  const progress = totalPages > 1 ? (currentPage - 1) / (totalPages - 1) : 0;
  const boundedProgress = Math.max(0, Math.min(1, progress));
  const gestureModelRef = useRef({
    width: 0,
    totalPages: 0,
    direction: 'rtl' as ReadingDirection,
    startProgress: 0,
    lastPage: 0,
    seekPage: (_page: number): void => undefined,
    settlePage: (_page: number): void => undefined,
  });

  useEffect(() => {
    gestureModelRef.current.width = progressWidth;
    gestureModelRef.current.totalPages = totalPages;
    gestureModelRef.current.direction = progressDirection;
    gestureModelRef.current.seekPage = (page) => onSeekPage(page, false);
    gestureModelRef.current.settlePage = (page) => onSeekPage(page, true);
  }, [onSeekPage, progressDirection, progressWidth, totalPages]);

  function onSeekPageFromProgress(rawProgress: number) {
    const gestureModel = gestureModelRef.current;
    if (gestureModel.totalPages <= 0) return;
    const logicalProgress = gestureModel.direction === 'rtl' ? 1 - rawProgress : rawProgress;
    const page = Math.round(logicalProgress * (gestureModel.totalPages - 1)) + 1;
    if (page === gestureModel.lastPage) return;
    gestureModel.lastPage = page;
    gestureModel.seekPage(page);
  }

  // PanResponder is created once so an active thumb drag is not interrupted by page updates.
  // eslint-disable-next-line react-hooks/refs
  const [progressResponder] = useState(() =>
    createProgressResponder(gestureModelRef, onSeekPageFromProgress),
  );

  return (
    <View
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      className="absolute bottom-0 left-0 right-0 z-20 bg-black/90 px-4 pt-3"
    >
      {/* Mode & Direction — only visible when Options is on */}
      {showModeOptions ? (
        <View className="mb-3 flex-row items-center justify-between gap-2 border-b border-neutral-800 pb-3">
          {/* Page Navigation (only in Manga/horizontal mode) */}
          {mode === 'horizontal' ? (
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={onPrevPage}
                disabled={currentPage <= 1}
                className={cn(
                  'rounded-lg bg-neutral-800 px-3 py-1.5',
                  currentPage <= 1 && 'opacity-40',
                )}
              >
                <Text className="text-xs font-semibold text-white">‹ Page</Text>
              </Pressable>
              <Text className="text-xs text-neutral-400">
                {currentPage}/{totalPages}
              </Text>
              <Pressable
                onPress={onNextPage}
                disabled={currentPage >= totalPages}
                className={cn(
                  'rounded-lg bg-neutral-800 px-3 py-1.5',
                  currentPage >= totalPages && 'opacity-40',
                )}
              >
                <Text className="text-xs font-semibold text-white">Page ›</Text>
              </Pressable>
            </View>
          ) : (
            <View className="items-center justify-center">
              <Text className="text-xs text-neutral-500">
                Ch. {currentPage > 0 ? currentPage : '—'} · {totalPages} pages
              </Text>
            </View>
          )}

          <View className="flex-row items-center gap-2">
            {/* Mode switcher: Webtoon / Manga */}
            <View className="flex-row rounded-lg bg-neutral-900 p-1">
              <Pressable
                onPress={() => onSelectMode('vertical')}
                className={cn(
                  'rounded-md px-2.5 py-1',
                  mode === 'vertical' ? 'bg-primary-600' : 'bg-transparent',
                )}
              >
                <Text className="text-xs font-medium text-white">Webtoon</Text>
              </Pressable>
              <Pressable
                onPress={() => onSelectMode('horizontal')}
                className={cn(
                  'rounded-md px-2.5 py-1',
                  mode === 'horizontal' ? 'bg-primary-600' : 'bg-transparent',
                )}
              >
                <Text className="text-xs font-medium text-white">Manga</Text>
              </Pressable>
            </View>

            {/* RTL/LTR only in Manga mode */}
            {mode === 'horizontal' ? (
              <View className="flex-row rounded-lg bg-neutral-900 p-1">
                <Pressable
                  onPress={() => onSelectDirection('rtl')}
                  className={cn(
                    'rounded-md px-2 py-1',
                    direction === 'rtl' ? 'bg-primary-600' : 'bg-transparent',
                  )}
                >
                  <Text className="text-xs text-white">RTL</Text>
                </Pressable>
                <Pressable
                  onPress={() => onSelectDirection('ltr')}
                  className={cn(
                    'rounded-md px-2 py-1',
                    direction === 'ltr' ? 'bg-primary-600' : 'bg-transparent',
                  )}
                >
                  <Text className="text-xs text-white">LTR</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Always-visible Chapter Navigation Row */}
      <View className="mb-3 h-5 px-1">
        <View
          className="absolute left-1 right-1 top-1.5 h-2 rounded-full bg-neutral-800"
          onLayout={(event) => {
            setProgressWidth(event.nativeEvent.layout.width);
          }}
          {...progressResponder.panHandlers}
        >
          <View
            pointerEvents="none"
            className="absolute h-full rounded-full bg-primary-500"
            style={{
              width: `${boundedProgress * 100}%`,
              ...(progressDirection === 'rtl' ? { right: 0 } : { left: 0 }),
            }}
          />
          <View
            pointerEvents="none"
            className="absolute -top-1.5 h-5 w-5 rounded-full border-2 border-white bg-primary-500 shadow"
            style={{
              ...(progressDirection === 'rtl'
                ? {
                    right: `${boundedProgress * 100}%`,
                  }
                : { left: `${boundedProgress * 100}%` }),
              transform: [{ translateX: progressDirection === 'rtl' ? 10 : -10 }],
            }}
          />
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={onPrevChapter}
          disabled={!hasPrevChapter}
          className={cn(
            'mr-2 flex-1 items-center rounded-lg border border-neutral-700 bg-neutral-900 py-2',
            !hasPrevChapter && 'opacity-40',
          )}
        >
          <Text className="text-xs font-semibold text-white">« Prev Chapter</Text>
        </Pressable>

        <Pressable
          onPress={onNextChapter}
          disabled={!hasNextChapter}
          className={cn(
            'ml-2 flex-1 items-center rounded-lg border border-neutral-700 bg-neutral-900 py-2',
            !hasNextChapter && 'opacity-40',
          )}
        >
          <Text className="text-xs font-semibold text-white">Next Chapter »</Text>
        </Pressable>
      </View>
    </View>
  );
}
