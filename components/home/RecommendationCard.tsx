import { Image, View } from 'react-native';
import { PopPressable as Pressable } from '@/components/ui/PopPressable';

import { Badge, Text } from '@/components/ui';
import { useMediaCover } from '@/hooks/useMediaCover';
import type { RecommendationItem } from '@/types/content';
import { cn } from '@/utils/cn';

type RecommendationCardProps = {
  item: RecommendationItem;
  onPress?: () => void;
  className?: string;
};

const badgeVariantMap = {
  anime: 'anime',
  manga: 'manga',
  novel: 'novel',
} as const;

const badgeLabelMap = {
  anime: 'Anime',
  manga: 'Manga',
  novel: 'Novel',
} as const;

export function RecommendationCard({ item, onPress, className }: RecommendationCardProps) {
  const displayCover = useMediaCover(item.id, item.coverUrl);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'w-64 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900',
        className,
      )}
    >
      <View className="flex-row">
        <Image
          source={displayCover?.trim() ? { uri: displayCover } : undefined}
          className="h-28 w-20"
          resizeMode="cover"
        />
        <View className="flex-1 gap-2 p-3">
          <Badge label={badgeLabelMap[item.type]} variant={badgeVariantMap[item.type]} />
          <Text variant="label" numberOfLines={2}>
            {item.title}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {item.reason}
          </Text>
          <Text variant="caption" tone="primary">
            {item.matchScore}% match
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
