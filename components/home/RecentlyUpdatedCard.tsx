import { View } from 'react-native';

import { ContentPosterCard } from '@/components/home/ContentPosterCard';
import { Text } from '@/components/ui';
import type { RecentlyUpdatedItem } from '@/types/content';
import { cn } from '@/utils/cn';

type RecentlyUpdatedCardProps = {
  item: RecentlyUpdatedItem;
  onPress?: () => void;
  className?: string;
};

export function RecentlyUpdatedCard({ item, onPress, className }: RecentlyUpdatedCardProps) {
  return (
    <View className={cn('w-28', className)}>
      <ContentPosterCard
        title={item.title}
        coverUrl={item.coverUrl}
        type={item.type}
        meta={item.latestLabel}
        onPress={onPress}
      />
      <Text variant="caption" tone="muted" className="mt-1">
        {item.updatedAgo}
      </Text>
    </View>
  );
}
