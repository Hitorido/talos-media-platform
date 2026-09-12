import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui';
import type { NovelChapter, ReaderSettings } from '@/types/novel';
import { cn } from '@/utils/cn';

type NovelReaderTextProps = {
  chapters: NovelChapter[];
  activeChapterId: string;
  settings: ReaderSettings;
  initialChapterId?: string;
  initialScrollPercentage?: number;
  onScrollProgress: (chapterId: string, percentage: number, paragraphIndex: number) => void;
  onChapterChange: (chapterId: string) => void;
  onTapScreen?: () => void;
};

export type NovelReaderTextRef = {
  scrollToProgress: (progress: number) => void;
};

const themeBgClasses: Record<ReaderSettings['theme'], string> = {
  dark: 'bg-[#0a0a0a]',
  light: 'bg-[#ffffff]',
  sepia: 'bg-[#f4ecd8]',
  midnight: 'bg-[#0f172a]',
};

const themeTextColors: Record<ReaderSettings['theme'], string> = {
  dark: '#f5f5f5',
  light: '#111827',
  sepia: '#433422',
  midnight: '#e2e8f0',
};

const themeDividerColors: Record<ReaderSettings['theme'], string> = {
  dark: '#262626',
  light: '#e5e7eb',
  sepia: '#d5c7a3',
  midnight: '#1e293b',
};

const themeChapterLabelColors: Record<ReaderSettings['theme'], string> = {
  dark: '#525252',
  light: '#9ca3af',
  sepia: '#7c6a53',
  midnight: '#475569',
};

const fontClasses: Record<ReaderSettings['fontFamily'], string> = {
  serif: 'font-serif',
  sans: 'font-sans',
  mono: 'font-mono',
};

const marginClasses: Record<ReaderSettings['margin'], string> = {
  narrow: 'px-4',
  medium: 'px-6',
  wide: 'px-10',
};

const lineSpacingHeights: Record<ReaderSettings['lineSpacing'], number> = {
  compact: 1.4,
  normal: 1.7,
  relaxed: 2.1,
};

export const NovelReaderText = forwardRef<NovelReaderTextRef, NovelReaderTextProps>(
  function NovelReaderText(
    {
      chapters,
      activeChapterId,
      settings,
      initialChapterId,
      initialScrollPercentage = 0,
      onScrollProgress,
      onChapterChange,
      onTapScreen,
    }: NovelReaderTextProps,
    ref,
  ) {
    const scrollViewRef = useRef<ScrollView>(null);
    const hasRestoredScrollRef = useRef(false);
    const currentChapterRef = useRef(activeChapterId);
    const targetChapterId = initialChapterId ?? activeChapterId;
    const lastBoundaryTriggerRef = useRef<{
      chapterId: string;
      scrollY: number;
      at: number;
    } | null>(null);
    // Map chapterId -> approximate scroll offset for chapter boundary detection
    const chapterOffsetMapRef = useRef<Record<string, number>>({});
    const totalContentHeightRef = useRef(0);

    useImperativeHandle(ref, () => ({
      scrollToProgress: (progress: number) => {
        const boundedProgress = Math.max(0, Math.min(1, progress));
        scrollViewRef.current?.scrollTo({
          y: boundedProgress * totalContentHeightRef.current,
          animated: false,
        });
      },
    }));

    const tryRestoreScrollPosition = useCallback(() => {
      if (hasRestoredScrollRef.current) return;

      const chapterOffset = chapterOffsetMapRef.current[targetChapterId];
      if (chapterOffset !== undefined) {
        hasRestoredScrollRef.current = true;
        scrollViewRef.current?.scrollTo({ y: chapterOffset, animated: false });
        currentChapterRef.current = targetChapterId;
        onChapterChange(targetChapterId);
        return;
      }

      if (initialScrollPercentage > 0 && totalContentHeightRef.current > 0) {
        hasRestoredScrollRef.current = true;
        scrollViewRef.current?.scrollTo({
          y: initialScrollPercentage * totalContentHeightRef.current,
          animated: false,
        });
      }
    }, [initialScrollPercentage, onChapterChange, targetChapterId]);

    const handleContentSizeChange = (_w: number, contentHeight: number) => {
      totalContentHeightRef.current = contentHeight;
      tryRestoreScrollPosition();
    };

    const handleScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
        const maxScroll = contentSize.height - layoutMeasurement.height;
        if (maxScroll <= 0) return;

        const scrollY = contentOffset.y;
        const scrollRatio = Math.min(Math.max(scrollY / maxScroll, 0), 1);

        // Determine the chapter by the scroll midpoint instead of a noisy edge threshold.
        const midpoint = scrollY + layoutMeasurement.height * 0.5;
        let visibleChapterId = chapters[0]?.id ?? activeChapterId;
        for (const ch of chapters) {
          const offset = chapterOffsetMapRef.current[ch.id] ?? 0;
          if (midpoint >= offset) {
            visibleChapterId = ch.id;
          }
        }

        const now = Date.now();
        const shouldUpdateChapter =
          visibleChapterId !== currentChapterRef.current &&
          (!lastBoundaryTriggerRef.current ||
            lastBoundaryTriggerRef.current.chapterId !== visibleChapterId ||
            Math.abs(scrollY - lastBoundaryTriggerRef.current.scrollY) > 150) &&
          (!lastBoundaryTriggerRef.current ||
            now - lastBoundaryTriggerRef.current.at > 850 ||
            lastBoundaryTriggerRef.current.chapterId !== visibleChapterId);

        if (shouldUpdateChapter) {
          currentChapterRef.current = visibleChapterId;
          lastBoundaryTriggerRef.current = { chapterId: visibleChapterId, scrollY, at: now };
          onChapterChange(visibleChapterId);
        }

        // Compute paragraph index within active chapter
        const activeChapter = chapters.find((ch) => ch.id === visibleChapterId);
        const paragraphIndex = activeChapter
          ? Math.min(
              Math.floor(scrollRatio * activeChapter.paragraphs.length),
              activeChapter.paragraphs.length - 1,
            )
          : 0;

        onScrollProgress(visibleChapterId, scrollRatio, paragraphIndex);
      },
      [chapters, activeChapterId, onChapterChange, onScrollProgress],
    );

    const lineMultiplier = lineSpacingHeights[settings.lineSpacing];
    const computedLineHeight = Math.round(settings.fontSize * lineMultiplier);
    const activeTextColor = themeTextColors[settings.theme];
    const dividerColor = themeDividerColors[settings.theme];
    const chapterLabelColor = themeChapterLabelColors[settings.theme];

    return (
      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        onTouchEnd={onTapScreen}
        onContentSizeChange={handleContentSizeChange}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        className={cn('flex-1', themeBgClasses[settings.theme])}
      >
        <View style={{ paddingTop: 80, paddingBottom: 120 }}>
          {chapters.map((chapter, chapterIndex) => (
            <View
              key={chapter.id}
              onLayout={(e) => {
                chapterOffsetMapRef.current[chapter.id] = e.nativeEvent.layout.y + 80;
                if (chapter.id === targetChapterId) {
                  tryRestoreScrollPosition();
                }
              }}
            >
              {/* Chapter separator */}
              <View
                className={cn('items-center py-5', marginClasses[settings.margin])}
                style={{ borderTopWidth: chapterIndex > 0 ? 1 : 0, borderTopColor: dividerColor }}
              >
                <Text
                  style={{ color: chapterLabelColor, fontSize: 10, letterSpacing: 2 }}
                  className="font-semibold uppercase"
                >
                  Chapter {chapter.number}
                </Text>
                <Text
                  style={{
                    color: activeTextColor,
                    fontSize: settings.fontSize + 2,
                    lineHeight: computedLineHeight + 6,
                  }}
                  className={cn('mt-1 text-center font-bold', fontClasses[settings.fontFamily])}
                >
                  {chapter.title}
                </Text>
              </View>

              {/* Paragraphs */}
              <View className={cn('gap-5', marginClasses[settings.margin])}>
                {chapter.paragraphs.map((paragraph, index) => (
                  <View key={`${chapter.id}-p${index}`} className="rounded p-1">
                    <Text
                      style={{
                        fontSize: settings.fontSize,
                        lineHeight: computedLineHeight,
                        color: activeTextColor,
                      }}
                      className={cn(fontClasses[settings.fontFamily])}
                    >
                      {paragraph}
                    </Text>
                  </View>
                ))}
              </View>

              {/* End of chapter marker */}
              <View className="items-center py-6">
                <View style={{ height: 1, width: 48, backgroundColor: dividerColor }} />
                <Text style={{ color: chapterLabelColor }} className="mt-2 text-xs">
                  End of Chapter {chapter.number}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  },
);
