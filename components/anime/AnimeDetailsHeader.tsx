import { MediaSourceHeader } from '@/components/content/MediaSourceHeader';
import { useState } from 'react';
import { Image, View } from 'react-native';

import { FavoriteTagModal } from '@/components/library';
import { Badge, Button, Text } from '@/components/ui';
import { useLibraryStore } from '@/stores/libraryStore';
import type { AnimeDetails } from '@/types/anime';

type AnimeDetailsHeaderProps = {
  anime: AnimeDetails;
};

export function AnimeDetailsHeader({ anime }: AnimeDetailsHeaderProps) {
  const addToLibrary = useLibraryStore((state) => state.addToLibrary);
  const removeFromLibrary = useLibraryStore((state) => state.removeFromLibrary);
  const toggleFavorite = useLibraryStore((state) => state.toggleFavorite);
  const saveFavorite = useLibraryStore((state) => state.saveFavorite);
  const addTag = useLibraryStore((state) => state.addTag);
  const entries = useLibraryStore((state) => state.entries);
  const tags = useLibraryStore((state) => state.tags);
  const isInLibrary = useLibraryStore((state) => state.isInLibrary(anime.id, 'anime'));
  const isFavorite = useLibraryStore((state) => state.isFavorite(anime.id, 'anime'));
  const [showFavoritePicker, setShowFavoritePicker] = useState(false);
  const entry = entries.find((item) => item.mediaId === anime.id && item.mediaType === 'anime');

  return (
    <>
      <View className="gap-4">
        <View className="overflow-hidden rounded-2xl bg-neutral-200 dark:bg-neutral-800">
          <Image
            source={{ uri: anime.bannerUrl }}
            className="aspect-video w-full"
            resizeMode="cover"
          />
        </View>
        <View className="gap-2">
          <Text variant="h1">{anime.title}</Text>
          <MediaSourceHeader id={anime.id} type={'Anime'} count={anime.episodes.length} />
          <View className="flex-row flex-wrap gap-2">
            <Badge label={anime.status === 'ongoing' ? 'Ongoing' : 'Completed'} variant="primary" />
            {anime.rating > 0 ? <Badge label={`★ ${anime.rating.toFixed(1)}`} variant="secondary" /> : null}
            {anime.genres.map((genre) => (
              <Badge key={genre} label={genre} variant="default" />
            ))}
          </View>
          <View className="flex-row gap-3 pt-2">
            <Button
              label={isInLibrary ? 'In Library' : 'Add to Library'}
              variant={isInLibrary ? 'secondary' : 'primary'}
              onPress={() =>
                isInLibrary ? removeFromLibrary(anime.id, 'anime') : addToLibrary(anime.id, 'anime')
              }
              className="flex-1"
            />
            <Button
              label={isFavorite ? '♥ Favorited' : '♡ Favorite'}
              variant={isFavorite ? 'secondary' : 'outline'}
              onPress={() =>
                isFavorite ? toggleFavorite(anime.id, 'anime') : setShowFavoritePicker(true)
              }
            />
          </View>
          <Text tone="muted">{anime.description}</Text>
        </View>
      </View>
      <FavoriteTagModal
        key={`${anime.id}-${showFavoritePicker}`}
        visible={showFavoritePicker}
        entry={entry}
        tags={tags}
        onClose={() => setShowFavoritePicker(false)}
        onCreateTag={addTag}
        onConfirm={(selectedTags) => {
          if (!isInLibrary) addToLibrary(anime.id, 'anime');
          saveFavorite(anime.id, 'anime', selectedTags);
          setShowFavoritePicker(false);
        }}
      />
    </>
  );
}
