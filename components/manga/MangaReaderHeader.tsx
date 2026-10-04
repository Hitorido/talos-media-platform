import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { ReaderPressable } from './ReaderPressable';

type MangaReaderHeaderProps = {
  onBookmark?: () => void;
  mangaTitle: string;
  chapterTitle: string;
  onBack: () => void;
  onToggleControls?: () => void;
  onOpenChapterList?: () => void;
  onSetCover?: () => void;
};

export const MangaReaderHeader = memo(function MangaReaderHeader({
  onBookmark,
  mangaTitle,
  chapterTitle,
  onBack,
  onToggleControls,
  onOpenChapterList,
  onSetCover,
}: MangaReaderHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingTop: Math.max(insets.top, 12) }}
      className="absolute left-0 right-0 top-0 z-20 bg-black/80 px-4 pb-3"
    >
      <View className="flex-row items-center justify-between">
        <ReaderPressable
          onPress={onBack}
          className="rounded-full bg-neutral-800 px-3 py-1.5 active:bg-neutral-700"
        >
          <Text className="text-sm font-medium text-white">‹ Back</Text>
        </ReaderPressable>

        <ReaderPressable onPress={onOpenChapterList} className="flex-1 items-center px-4">
          <Text variant="label" numberOfLines={1} className="text-white">
            {mangaTitle}
          </Text>
          <Text variant="caption" numberOfLines={1} className="text-neutral-400">
            {chapterTitle}
          </Text>
        </ReaderPressable>

        <ReaderPressable
          onPress={onBookmark}
          accessibilityLabel="Bookmark this page"
          className="mr-2 rounded-full bg-neutral-800 px-3 py-2"
        >
          <Text className="text-white">Bookmark</Text>
        </ReaderPressable>
        <ReaderPressable
          onPress={onSetCover}
          accessibilityLabel="Use this page as the title cover"
          className="mr-2 rounded-full bg-neutral-800 px-2.5 py-2"
        >
          <Ionicons name="image-outline" size={17} color="white" />
        </ReaderPressable>
        <ReaderPressable
          onPress={onToggleControls}
          className="rounded-full bg-neutral-800 px-3 py-1.5 active:bg-neutral-700"
        >
          <Text className="text-sm font-medium text-white">Options</Text>
        </ReaderPressable>
      </View>
    </View>
  );
});
