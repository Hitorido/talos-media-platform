import { Image, Pressable, View } from 'react-native';

import { Badge, Text } from '@/components/ui';
import type { ContentType } from '@/types/content';
import { cn } from '@/utils/cn';

type ContentPosterCardProps = {
  title: string;
  coverUrl: string;
  type: ContentType;
  subtitle?: string;
  meta?: string;
  onPress?: () => void;
  className?: string;
};

const badgeVariantMap: Record<ContentType, 'anime' | 'manga' | 'novel'> = {
  anime: 'anime',
  manga: 'manga',
  novel: 'novel',
};

const badgeLabelMap: Record<ContentType, string> = {
  anime: 'Anime',
  manga: 'Manga',
  novel: 'Novel',
};

export function ContentPosterCard({
  title,
  coverUrl,
  type,
  subtitle,
  meta,
  onPress,
  className,
}: ContentPosterCardProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className={cn('w-28', className)}>
      <View className="overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
        <Image source={{ uri: coverUrl }} className="aspect-[2/3] w-full" resizeMode="cover" />
        <View className="absolute left-2 top-2">
          <Badge label={badgeLabelMap[type]} variant={badgeVariantMap[type]} />
        </View>
        {meta ? (
          <View className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5">
            <Text variant="caption" className="text-white">
              {meta}
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="label" numberOfLines={2} className="mt-2">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="caption" tone="muted" numberOfLines={1} className="mt-0.5">
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}
