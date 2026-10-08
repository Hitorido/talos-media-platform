import { CoverVignette } from '@/components/content/CoverVignette';
import { MediaSourceHeader } from '@/components/content/MediaSourceHeader';
import { useState } from 'react';
import { Image, View } from 'react-native';

import { CoverCustomizeButton } from '@/components/content/CoverCustomizeButton';
import { FavoriteTagModal } from '@/components/library';
import { Badge, Button, Text } from '@/components/ui';
import { useLibraryStore } from '@/stores/libraryStore';
import type { MangaDetails } from '@/types/manga';
import { useMediaCover } from '@/hooks/useMediaCover';

type MangaDetailsHeaderProps = {
  manga: MangaDetails;
};

export function MangaDetailsHeader({ manga }: MangaDetailsHeaderProps) {
  const displayCover = useMediaCover(manga.id, manga.coverUrl);
  const customCoverUrl = useLibraryStore((state) => state.media[manga.id]?.customCoverUrl);
  const addToLibrary = useLibraryStore((state) => state.addToLibrary);
  const removeFromLibrary = useLibraryStore((state) => state.removeFromLibrary);
  const toggleUnifiedFavorite = useLibraryStore((state) => state.toggleFavorite);
  const saveFavorite = useLibraryStore((state) => state.saveFavorite);
  const addTag = useLibraryStore((state) => state.addTag);
  const entries = useLibraryStore((state) => state.entries);
  const tags = useLibraryStore((state) => state.tags);
  const mangaType = manga.genres.includes('Manhwa')
    ? 'manhwa'
    : manga.genres.includes('Manhua')
      ? 'manhua'
      : 'manga';
  const isInUnifiedLibrary = useLibraryStore((state) => state.isInLibrary(manga.id, mangaType));
  const isUnifiedFavorite = useLibraryStore((state) => state.isFavorite(manga.id, mangaType));
  const [showFavoritePicker, setShowFavoritePicker] = useState(false);
  const entry = entries.find((item) => item.mediaId === manga.id && item.mediaType === mangaType);

  return (
    <>
      <View className="gap-4">
        <View className="relative overflow-hidden rounded-2xl bg-neutral-200 dark:bg-neutral-800">
          <Image
            source={
              // A user-chosen custom cover wins over the provider banner so the
              // details view always reflects the customization.
              customCoverUrl?.trim()
                ? { uri: customCoverUrl.trim() }
                : manga.bannerUrl?.trim()
                  ? { uri: manga.bannerUrl }
                  : displayCover?.trim()
                    ? { uri: displayCover }
                    : undefined
            }
            className="aspect-video w-full"
            resizeMode="cover"
          />
          <CoverVignette uri={displayCover} />
          <View className="absolute bottom-3 left-3 flex-row items-end gap-3">
            <View className="relative">
              <Image
                source={
                  displayCover?.trim()
                    ? { uri: displayCover }
                    : manga.bannerUrl?.trim()
                      ? { uri: manga.bannerUrl }
                      : undefined
                }
                className="h-28 w-20 rounded-lg shadow-md"
                resizeMode="cover"
                defaultSource={undefined}
              />
              <CoverCustomizeButton
                media={{
                  id: manga.id,
                  title: manga.title,
                  coverUrl: manga.coverUrl,
                  bannerUrl: manga.bannerUrl,
                  mediaType: mangaType,
                  genres: manga.genres,
                  chapterCount: manga.chapters.length,
                }}
                compact
                className="absolute right-1 top-1"
              />
            </View>
          </View>
        </View>

        <View className="gap-2">
          <Text variant="h1">{manga.title}</Text>
          <MediaSourceHeader
            id={manga.id}
            type={mangaType === 'manhwa' ? 'Manhwa' : mangaType === 'manhua' ? 'Manhua' : 'Manga'}
            count={manga.chapters.length}
          />

          {manga.altTitles && manga.altTitles.length > 0 ? (
            <Text variant="caption" tone="muted">
              Alt: {manga.altTitles.join(' • ')}
            </Text>
          ) : null}

          <View className="flex-row items-center gap-2">
            <Text variant="bodySmall" tone="muted">
              By <Text variant="bodySmall">{manga.author}</Text>
            </Text>
            {manga.artist !== manga.author ? (
              <Text variant="bodySmall" tone="muted">
                · Art: <Text variant="bodySmall">{manga.artist}</Text>
              </Text>
            ) : null}
          </View>

          <View className="flex-row flex-wrap gap-2 pt-1">
            <Badge label={manga.status === 'ongoing' ? 'Ongoing' : 'Completed'} variant="primary" />
            {manga.rating > 0 ? (
              <Badge label={`★ ${manga.rating.toFixed(1)}`} variant="secondary" />
            ) : null}
            {manga.genres.map((genre) => (
              <Badge key={genre} label={genre} variant="default" />
            ))}
          </View>

          <View className="flex-row gap-3 pt-2">
            <Button
              label={isInUnifiedLibrary ? 'In Library' : 'Add to Library'}
              variant={isInUnifiedLibrary ? 'secondary' : 'primary'}
              onPress={() =>
                isInUnifiedLibrary
                  ? removeFromLibrary(manga.id, mangaType)
                  : addToLibrary(manga.id, mangaType)
              }
              className="flex-1"
            />
            <Button
              label={isUnifiedFavorite ? '♥ Favorited' : '♡ Favorite'}
              variant={isUnifiedFavorite ? 'secondary' : 'outline'}
              onPress={() =>
                isUnifiedFavorite
                  ? toggleUnifiedFavorite(manga.id, mangaType)
                  : setShowFavoritePicker(true)
              }
            />
          </View>

          <Text tone="muted" className="pt-2">
            {manga.description}
          </Text>
        </View>
      </View>
      <FavoriteTagModal
        key={`${manga.id}-${showFavoritePicker}`}
        visible={showFavoritePicker}
        entry={entry}
        tags={tags}
        onClose={() => setShowFavoritePicker(false)}
        onCreateTag={addTag}
        onConfirm={(selectedTags) => {
          if (!isInUnifiedLibrary) addToLibrary(manga.id, mangaType);
          saveFavorite(manga.id, mangaType, selectedTags);
          setShowFavoritePicker(false);
        }}
      />
    </>
  );
}
