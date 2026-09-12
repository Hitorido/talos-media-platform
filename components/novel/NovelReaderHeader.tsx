import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import type { NovelTheme } from '@/types/novel';
import { cn } from '@/utils/cn';

type NovelReaderHeaderProps = {
  novelTitle: string;
  chapterTitle: string;
  theme: NovelTheme;
  isBookmarked: boolean;
  onBack: () => void;
  onToggleBookmark: () => void;
  onToggleSettings: () => void;
  onOpenChapterList?: () => void;
};

const themeBgClasses: Record<NovelTheme, string> = {
  dark: 'bg-neutral-900/95 border-neutral-800',
  light: 'bg-white/95 border-neutral-200',
  sepia: 'bg-[#f4ecd8]/95 border-[#e2d5b5]',
  midnight: 'bg-[#0f172a]/95 border-[#1e293b]',
};

const themeTextClasses: Record<NovelTheme, string> = {
  dark: 'text-white',
  light: 'text-neutral-900',
  sepia: 'text-[#433422]',
  midnight: 'text-[#e2e8f0]',
};

const themeTextColors: Record<NovelTheme, string> = {
  dark: '#ffffff',
  light: '#171717',
  sepia: '#433422',
  midnight: '#e2e8f0',
};

const themeMutedTextColors: Record<NovelTheme, string> = {
  dark: '#a3a3a3',
  light: '#737373',
  sepia: '#7c6a53',
  midnight: '#94a3b8',
};

const themeMutedTextClasses: Record<NovelTheme, string> = {
  dark: 'text-neutral-400',
  light: 'text-neutral-500',
  sepia: 'text-[#7c6a53]',
  midnight: 'text-[#94a3b8]',
};

export function NovelReaderHeader({
  novelTitle,
  chapterTitle,
  theme,
  isBookmarked,
  onBack,
  onToggleBookmark,
  onToggleSettings,
  onOpenChapterList,
}: NovelReaderHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingTop: Math.max(insets.top, 12) }}
      className={cn(
        'absolute left-0 right-0 top-0 z-20 border-b px-4 pb-3 shadow-md',
        themeBgClasses[theme],
      )}
    >
      <View className="flex-row items-center justify-between gap-2">
        <Pressable
          onPress={onBack}
          className="rounded-full bg-neutral-500/20 px-3 py-1.5 active:bg-neutral-500/30"
        >
          <Text
            style={{ color: themeTextColors[theme] }}
            className={cn('text-xs font-semibold', themeTextClasses[theme])}
          >
            ‹ Back
          </Text>
        </Pressable>

        <Pressable onPress={onOpenChapterList} className="flex-1 items-center px-2">
          <Text
            variant="label"
            numberOfLines={1}
            style={{ color: themeTextColors[theme] }}
            className={cn('text-xs font-bold', themeTextClasses[theme])}
          >
            {novelTitle}
          </Text>
          <Text
            variant="caption"
            numberOfLines={1}
            style={{ color: themeMutedTextColors[theme] }}
            className={cn('text-[10px]', themeMutedTextClasses[theme])}
          >
            {chapterTitle}
          </Text>
        </Pressable>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={onToggleBookmark}
            className="rounded-full bg-neutral-500/20 px-2.5 py-1.5 active:bg-neutral-500/30"
          >
            <Text
              style={{ color: themeTextColors[theme] }}
              className={cn('text-xs font-medium', themeTextClasses[theme])}
            >
              {isBookmarked ? '★ Saved' : '☆ Bookmark'}
            </Text>
          </Pressable>

          <Pressable
            onPress={onToggleSettings}
            className="rounded-full bg-neutral-500/20 px-2.5 py-1.5 active:bg-neutral-500/30"
          >
            <Text
              style={{ color: themeTextColors[theme] }}
              className={cn('text-xs font-medium', themeTextClasses[theme])}
            >
              ⚙ AA
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
