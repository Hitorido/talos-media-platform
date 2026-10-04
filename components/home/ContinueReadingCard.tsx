import { useMediaCover } from '@/hooks/useMediaCover';
import { Ionicons } from '@expo/vector-icons';
import { Image, View } from 'react-native';
import { PopPressable as Pressable } from '@/components/ui/PopPressable';

import { ProgressBar } from '@/components/home/ProgressBar';
import { Badge, Text } from '@/components/ui';
import type { ContinueReadingItem } from '@/types/content';
import { cn } from '@/utils/cn';

type ContinueReadingCardProps = {
  item: ContinueReadingItem;
  onPress?: () => void;
  onContinue?: () => void;
  className?: string;
};

export function ContinueReadingCard({
  item,
  onPress,
  onContinue,
  className,
}: ContinueReadingCardProps) {
  const displayCover = useMediaCover(item.id, item.coverUrl);
  const typeLabel = item.type === 'manga' ? 'Manga' : 'Novel';

  return (
    <View className={cn('w-64 gap-2', className)}>
      <Pressable accessibilityRole="button" onPress={onPress} className="flex-row gap-3">
        {/* Fixed dimensions prevent the container from stretching to match the text column height */}
        <View
          style={{ width: 80, height: 112 }}
          className="self-start overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800"
        >
          <Image
            source={displayCover?.trim() ? { uri: displayCover } : undefined}
            style={{ width: 80, height: 112 }}
            resizeMode="cover"
            defaultSource={undefined}
          />
        </View>
        <View className="flex-1 justify-start gap-2 py-0.5">
          <Badge label={typeLabel} variant={item.type} />
          <Text variant="label" numberOfLines={2}>
            {item.title}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            Ch. {item.chapter}: {item.chapterTitle}
          </Text>
          <ProgressBar progress={item.progress} />
          <Text variant="caption" tone="muted">
            {Math.round(item.progress * 100)}% complete
          </Text>
        </View>
      </Pressable>
      {onContinue ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue from saved position"
          onPress={onContinue}
          className="flex-row items-center gap-2 self-start rounded-full bg-primary-600 px-3 py-2"
        >
          <Ionicons name="book-outline" size={16} color="white" />
          <Text className="text-xs font-semibold text-white">Continue</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
