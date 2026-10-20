import { MediaCount } from '@/components/content/MediaCount';
import { PublicationStatus } from '@/components/content/PublicationStatus';
import { PopPressable as Pressable } from '@/components/ui/PopPressable';
import { Animated, Image, Modal, useWindowDimensions, View } from 'react-native';

import { Badge, Text } from '@/components/ui';
import { useMediaCover } from '@/hooks/useMediaCover';
import type { ContentType } from '@/types/content';
import { cn } from '@/utils/cn';
import { useRef, useState } from 'react';

type ContentPosterCardProps = {
  routeId?: string;
  sourceName?: string;
  status?: string;
  episodeCount?: number;
  chapterCount?: number;
  title: string;
  coverUrl: string;
  type: ContentType;
  subtitle?: string;
  meta?: string;
  alternativeTitles?: string[];
  onPress?: () => void;
  onLongPress?: () => void;
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
  routeId,
  episodeCount,
  chapterCount,
  sourceName,
  status,
  title,
  coverUrl,
  type,
  subtitle,
  meta,
  alternativeTitles,
  onPress,
  onLongPress,
  className,
}: ContentPosterCardProps) {
  const displayCover = useMediaCover(routeId, coverUrl);
  const typeLabel = badgeLabelMap[type];
  const [focused, setFocused] = useState(false);
  const [cardLayout, setCardLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const scale = useRef(new Animated.Value(1)).current;
  const { width: screenWidth } = useWindowDimensions();

  const handleLongPress = () => {
    if (cardLayout) {
      setFocused(true);
      Animated.spring(scale, {
        toValue: 1.1,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
      onLongPress?.();
    }
  };

  const handlePressOut = () => {
    if (focused) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start(() => setFocused(false));
    }
  };

  const buttonSide = cardLayout ? (cardLayout.x > screenWidth / 2 ? 'left' : 'right') : 'right';

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onLongPress={handleLongPress}
        onPressOut={handlePressOut}
        onLayout={(e) => {
          const { x, y, width, height } = e.nativeEvent.layout;
          setCardLayout({ x, y, width, height });
        }}
        className={cn('w-28', className)}
      >
        <View className="overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
          {displayCover ? (
            <Image
              source={displayCover?.trim() ? { uri: displayCover } : undefined}
              className="aspect-[2/3] w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="aspect-[2/3] w-full items-center justify-center px-2">
              <Text variant="caption" tone="muted">
                No cover
              </Text>
            </View>
          )}
          <View className="absolute left-2 top-2">
            <Badge label={typeLabel} variant={badgeVariantMap[type]} />
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
        {sourceName ? (
          <View className="mt-1 gap-1">
            <Badge label={sourceName} variant="primary" />
            <PublicationStatus status={status} />
          </View>
        ) : null}
        {subtitle && !sourceName ? (
          <Text variant="caption" tone="muted" numberOfLines={1} className="mt-0.5">
            {subtitle}
          </Text>
        ) : null}
        {routeId ? (
          <MediaCount
            routeId={routeId}
            type={type}
            episodeCount={episodeCount}
            chapterCount={chapterCount}
          />
        ) : null}
      </Pressable>

      {focused && cardLayout && (
        <Modal visible={focused} transparent animationType="fade">
          <View
            style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
            onStartShouldSetResponder={() => true}
            onResponderRelease={handlePressOut}
          >
            <Animated.View
              style={{
                position: 'absolute',
                left: cardLayout.x - (cardLayout.width * 0.1) / 2,
                top: cardLayout.y - (cardLayout.height * 0.1) / 2,
                width: cardLayout.width * 1.1,
                height: cardLayout.height * 1.1,
                transform: [{ scale }],
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.5,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <View className="overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
                {displayCover ? (
                  <Image
                    source={displayCover?.trim() ? { uri: displayCover } : undefined}
                    className="aspect-[2/3] w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="aspect-[2/3] w-full items-center justify-center px-2">
                    <Text variant="caption" tone="muted">
                      No cover
                    </Text>
                  </View>
                )}
                <View className="absolute left-2 top-2">
                  <Badge label={typeLabel} variant={badgeVariantMap[type]} />
                </View>
              </View>
            </Animated.View>

            <View
              style={{
                position: 'absolute',
                [buttonSide]: 16,
                top: cardLayout.y + cardLayout.height / 2,
              }}
            >
              <View className="rounded-full bg-primary-500 p-3 shadow-lg">
                <Text className="text-white text-2xl">♥</Text>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
