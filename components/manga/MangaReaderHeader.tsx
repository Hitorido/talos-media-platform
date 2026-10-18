import { Ionicons } from '@expo/vector-icons';
import { memo, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { ReaderPressable } from './ReaderPressable';

type MangaReaderHeaderProps = {
  onBookmark?: () => void;
  isBookmarked?: boolean;
  mangaTitle: string;
  chapterTitle: string;
  onBack: () => void;
  onToggleControls?: () => void;
  onOpenChapterList?: () => void;
  onSetCover?: () => void;
};

export const MangaReaderHeader = memo(function MangaReaderHeader({
  onBookmark,
  isBookmarked = false,
  mangaTitle,
  chapterTitle,
  onBack,
  onToggleControls,
  onOpenChapterList,
  onSetCover,
}: MangaReaderHeaderProps) {
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleBookmark = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.25,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    onBookmark?.();
  };

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

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <ReaderPressable
            onPress={handleBookmark}
            accessibilityLabel="Bookmark this page"
            className={`mr-2 flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
              isBookmarked ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-neutral-800'
            }`}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={15}
              color={isBookmarked ? '#eab308' : '#ffffff'}
            />
            <Text className={isBookmarked ? 'text-xs font-semibold text-amber-400' : 'text-xs font-medium text-white'}>
              {isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </Text>
          </ReaderPressable>
        </Animated.View>
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
