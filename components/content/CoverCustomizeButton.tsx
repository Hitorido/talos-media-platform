import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { PopPressable } from '@/components/ui';
import { persistCustomCover } from '@/services/customCoverService';
import { useLibraryStore } from '@/stores/libraryStore';
import type { LibraryMedia } from '@/types/library';
import { cn } from '@/utils/cn';

type CoverCustomizeButtonProps = {
  /** Local library metadata for the title whose cover is being personalised. */
  media: LibraryMedia;
  /** Positioning/extra classes, e.g. an absolute corner over a cover. */
  className?: string;
  /** Smaller icon + hit area for poster covers. */
  compact?: boolean;
};

/**
 * Subtle, local-only cover personalisation affordance.
 *
 * Shows one small icon implying the cover can be customised. When a custom cover
 * already exists a second small icon restores the provider cover. Only a local
 * URI/reference is stored once (see `setCoverOverride`) and resolved everywhere
 * through `useMediaCover`; nothing is ever uploaded to the provider.
 */
export function CoverCustomizeButton({
  media,
  className,
  compact = false,
}: CoverCustomizeButtonProps) {
  const setCoverOverride = useLibraryStore((state) => state.setCoverOverride);
  const hasCustomCover = useLibraryStore((state) => Boolean(state.media[media.id]?.customCoverUrl));
  const [busy, setBusy] = useState(false);

  const pickCover = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [2, 3],
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const localUri = await persistCustomCover(result.assets[0].uri);
      setCoverOverride(media, localUri);
    } catch (error) {
      Alert.alert(
        'Cover could not be changed',
        error instanceof Error ? error.message : 'Please try choosing the image again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const iconSize = compact ? 13 : 15;
  const sizeClass = compact ? 'h-6 w-6' : 'h-7 w-7';

  return (
    <View className={cn('flex-row items-center gap-1.5', className)}>
      <PopPressable
        accessibilityRole="button"
        accessibilityLabel={
          hasCustomCover ? `Change cover for ${media.title}` : `Customise cover for ${media.title}`
        }
        disabled={busy}
        onPress={() => void pickCover()}
        className={cn(
          'items-center justify-center rounded-full border border-white/20 bg-black/55',
          sizeClass,
          busy && 'opacity-60',
        )}
        hitSlop={8}
      >
        <Ionicons name="pencil" size={iconSize} color="#ffffff" />
      </PopPressable>
      {hasCustomCover ? (
        <PopPressable
          accessibilityRole="button"
          accessibilityLabel={`Restore the source cover for ${media.title}`}
          onPress={() => setCoverOverride(media, undefined)}
          className={cn(
            'items-center justify-center rounded-full border border-white/20 bg-black/55',
            sizeClass,
          )}
          hitSlop={8}
        >
          <Ionicons name="close" size={iconSize} color="#ffffff" />
        </PopPressable>
      ) : null}
    </View>
  );
}
