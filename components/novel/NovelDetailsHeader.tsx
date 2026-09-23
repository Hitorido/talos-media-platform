import { MediaSourceHeader } from '@/components/content/MediaSourceHeader';
import { useState } from 'react';
import { Image, View } from 'react-native';

import { FavoriteTagModal } from '@/components/library';
import { Badge, Button, Text } from '@/components/ui';
import { useLibraryStore } from '@/stores/libraryStore';
import type { NovelDetails } from '@/types/novel';

type NovelDetailsHeaderProps = {
  novel: NovelDetails;
};

export function NovelDetailsHeader({ novel }: NovelDetailsHeaderProps) {
  const addToLibrary = useLibraryStore((state) => state.addToLibrary);
  const removeFromLibrary = useLibraryStore((state) => state.removeFromLibrary);
  const toggleUnifiedFavorite = useLibraryStore((state) => state.toggleFavorite);
  const saveFavorite = useLibraryStore((state) => state.saveFavorite);
  const addTag = useLibraryStore((state) => state.addTag);
  const entries = useLibraryStore((state) => state.entries);
  const tags = useLibraryStore((state) => state.tags);
  const isInLibrary = useLibraryStore((state) => state.isInLibrary(novel.id, 'novel'));
  const isFavorite = useLibraryStore((state) => state.isFavorite(novel.id, 'novel'));
  const [showFavoritePicker, setShowFavoritePicker] = useState(false);
  const entry = entries.find((item) => item.mediaId === novel.id && item.mediaType === 'novel');

  return (
    <>
      <View className="gap-4">
        <View className="relative overflow-hidden rounded-2xl bg-neutral-200 dark:bg-neutral-800">
          <Image
            source={{ uri: novel.bannerUrl }}
            className="aspect-video w-full"
            resizeMode="cover"
          />
          <View className="absolute bottom-3 left-3 flex-row items-end gap-3">
            <Image
              source={{ uri: novel.coverUrl }}
              className="h-28 w-20 rounded-lg shadow-md"
              resizeMode="cover"
            />
          </View>
        </View>

        <View className="gap-2">
          <Text variant="h1">{novel.title}</Text>
          <MediaSourceHeader id={novel.id} type={'Novel'} count={novel.chapters.length} language={novel.language} />

          {novel.altTitles && novel.altTitles.length > 0 ? (
            <Text variant="caption" tone="muted">
              Alt: {novel.altTitles.join(' • ')}
            </Text>
          ) : null}

          <View className="flex-row items-center gap-2">
            <Text variant="bodySmall" tone="muted">
              By <Text variant="bodySmall">{novel.author}</Text>
            </Text>
            {novel.translator ? (
              <Text variant="bodySmall" tone="muted">
                · Trans: <Text variant="bodySmall">{novel.translator}</Text>
              </Text>
            ) : null}
          </View>

          <View className="flex-row flex-wrap gap-2 pt-1">
            <Badge label={novel.status === 'ongoing' ? 'Ongoing' : 'Completed'} variant="primary" />
            {novel.rating > 0 ? <Badge label={`★ ${novel.rating.toFixed(1)}`} variant="secondary" /> : null}
            {novel.genres.map((genre) => (
              <Badge key={genre} label={genre} variant="default" />
            ))}
          </View>

          <View className="flex-row gap-3 pt-2">
            <Button
              label={isInLibrary ? 'In Library' : 'Add to Library'}
              variant={isInLibrary ? 'secondary' : 'primary'}
              onPress={() =>
                isInLibrary ? removeFromLibrary(novel.id, 'novel') : addToLibrary(novel.id, 'novel')
              }
              className="flex-1"
            />
            <Button
              label={isFavorite ? '♥ Favorited' : '♡ Favorite'}
              variant={isFavorite ? 'secondary' : 'outline'}
              onPress={() =>
                isFavorite ? toggleUnifiedFavorite(novel.id, 'novel') : setShowFavoritePicker(true)
              }
            />
          </View>

          <Text tone="muted" className="pt-2">
            {novel.description}
          </Text>
        </View>
      </View>
      <FavoriteTagModal
        key={`${novel.id}-${showFavoritePicker}`}
        visible={showFavoritePicker}
        entry={entry}
        tags={tags}
        onClose={() => setShowFavoritePicker(false)}
        onCreateTag={addTag}
        onConfirm={(selectedTags) => {
          if (!isInLibrary) addToLibrary(novel.id, 'novel');
          saveFavorite(novel.id, 'novel', selectedTags);
          setShowFavoritePicker(false);
        }}
      />
    </>
  );
}
