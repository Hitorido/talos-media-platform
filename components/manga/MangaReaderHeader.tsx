import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';

type MangaReaderHeaderProps = {
  mangaTitle: string;
  chapterTitle: string;
  onBack: () => void;
  onToggleControls?: () => void;
  onOpenChapterList?: () => void;
};

export function MangaReaderHeader({
  mangaTitle,
  chapterTitle,
  onBack,
  onToggleControls,
  onOpenChapterList,
}: MangaReaderHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingTop: Math.max(insets.top, 12) }}
      className="absolute left-0 right-0 top-0 z-20 bg-black/80 px-4 pb-3"
    >
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={onBack}
          className="rounded-full bg-neutral-800 px-3 py-1.5 active:bg-neutral-700"
        >
          <Text className="text-sm font-medium text-white">‹ Back</Text>
        </Pressable>

        <Pressable onPress={onOpenChapterList} className="flex-1 items-center px-4">
          <Text variant="label" numberOfLines={1} className="text-white">
            {mangaTitle}
          </Text>
          <Text variant="caption" numberOfLines={1} className="text-neutral-400">
            {chapterTitle}
          </Text>
        </Pressable>

        <Pressable
          onPress={onToggleControls}
          className="rounded-full bg-neutral-800 px-3 py-1.5 active:bg-neutral-700"
        >
          <Text className="text-sm font-medium text-white">Options</Text>
        </Pressable>
      </View>
    </View>
  );
}
