import { Image, Pressable, View } from 'react-native';

import { ProgressBar } from '@/components/home/ProgressBar';
import { Badge, Text } from '@/components/ui';
import type { ContinueReadingItem } from '@/types/content';
import { cn } from '@/utils/cn';

type ContinueReadingCardProps = {
  item: ContinueReadingItem;
  onPress?: () => void;
  className?: string;
};

export function ContinueReadingCard({ item, onPress, className }: ContinueReadingCardProps) {
  const typeLabel = item.type === 'manga' ? 'Manga' : 'Novel';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn('w-64 flex-row gap-3', className)}
    >
      <View className="overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
        <Image source={item.coverUrl?.trim() ? { uri: item.coverUrl } : undefined} className="h-28 w-20" resizeMode="cover" />
      </View>
      <View className="flex-1 justify-center gap-2">
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
  );
}
