import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { LibraryCard } from '@/components/library';
import { Screen, SwipeableRow, Text } from '@/components/ui';
import { animeDetailsHref, mangaDetailsHref, novelDetailsHref } from '@/lib/routes';
import { animeCatalog } from '@/services/mock/animeData';
import { mangaCatalog } from '@/services/mock/mangaData';
import { novelCatalog } from '@/services/mock/novelData';
import { useAnimeProgressStore } from '@/stores/animeProgressStore';
import { useDownloadStore } from '@/stores/downloadStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useMangaProgressStore } from '@/stores/mangaProgressStore';
import { useNovelProgressStore } from '@/stores/novelProgressStore';
import type { LibraryEntry, LibraryMediaType, LibraryStatus, LibraryView } from '@/types/library';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// Extend view to include 'downloaded'
type ExtendedView = LibraryView | 'downloaded';

const viewTabs: { id: ExtendedView; label: string; icon: string }[] = [
  { id: 'library', label: 'Library', icon: 'library-outline' },
  { id: 'favorites', label: 'Favorites', icon: 'heart-outline' },
  { id: 'history', label: 'History', icon: 'time-outline' },
  { id: 'downloaded', label: 'Downloaded', icon: 'cloud-done-outline' },
];

const mediaFilters: { id: 'all' | LibraryMediaType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'anime', label: 'Anime' },
  { id: 'manga', label: 'Manga' },
  { id: 'manhwa', label: 'Manhwa' },
  { id: 'manhua', label: 'Manhua' },
  { id: 'novel', label: 'Novels' },
];

const statusFilters: { id: 'all' | LibraryStatus; label: string }[] = [
  { id: 'all', label: 'All Status' },
  { id: 'watching', label: 'Watching' },
  { id: 'reading', label: 'Reading' },
  { id: 'completed', label: 'Completed' },
  { id: 'dropped', label: 'Dropped' },
  { id: 'plan-to-watch', label: 'Plan to Watch' },
  { id: 'plan-to-read', label: 'Plan to Read' },
];

function getMangaMediaType(genres: string[]): 'manga' | 'manhwa' | 'manhua' {
  if (genres.includes('Manhwa')) return 'manhwa';
  if (genres.includes('Manhua')) return 'manhua';
  return 'manga';
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function LibraryScreen() {
  const router = useRouter();
  const entries = useLibraryStore((state) => state.entries);
  const removeFromLibrary = useLibraryStore((state) => state.removeFromLibrary);
  const toggleFavorite = useLibraryStore((state) => state.toggleFavorite);
  const setStatus = useLibraryStore((state) => state.setStatus);
  const animeProgress = useAnimeProgressStore((state) => state.progressByAnime);
  const removeAnimeProgress = useAnimeProgressStore((state) => state.removeEpisodeProgress);
  const mangaProgress = useMangaProgressStore((state) => state.progressByManga);
  const removeMangaProgress = useMangaProgressStore((state) => state.removeMangaProgress);
  const novelProgress = useNovelProgressStore((state) => state.progressByNovel);
  const removeNovelProgress = useNovelProgressStore((state) => state.removeNovelProgress);
  const downloadItems = useDownloadStore((state) => state.items);

  const [view, setView] = useState<ExtendedView>('library');
  const [mediaFilter, setMediaFilter] = useState<'all' | LibraryMediaType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | LibraryStatus>('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const tags = useLibraryStore((state) => state.tags);

  // Compute which mediaIds have at least one completed download
  const downloadedMediaIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of Object.values(downloadItems)) {
      if (item.status === 'completed') ids.add(item.mediaId);
    }
    return ids;
  }, [downloadItems]);

  const catalog = useMemo(
    () => [
      ...animeCatalog.map((item) => ({ ...item, mediaType: 'anime' as const })),
      ...mangaCatalog.map((item) => ({ ...item, mediaType: getMangaMediaType(item.genres) })),
      ...novelCatalog.map((item) => ({ ...item, mediaType: 'novel' as const })),
    ],
    [],
  );

  const rows = useMemo(() => {
    const historyEntries: LibraryEntry[] = [
      ...Object.values(animeProgress).map((progress) => ({
        mediaId: progress.animeId,
        mediaType: 'anime' as const,
        status:
          progress.positionSeconds / progress.durationSeconds >= 0.9
            ? ('completed' as const)
            : ('watching' as const),
        isFavorite:
          entries.find((entry) => entry.mediaId === progress.animeId && entry.mediaType === 'anime')
            ?.isFavorite ?? false,
        tags:
          entries.find((entry) => entry.mediaId === progress.animeId && entry.mediaType === 'anime')
            ?.tags ?? [],
        addedAt: progress.updatedAt,
        updatedAt: progress.updatedAt,
      })),
      ...Object.values(mangaProgress).map((progress) => ({
        mediaId: progress.mangaId,
        mediaType: getMangaMediaType(
          mangaCatalog.find((item) => item.id === progress.mangaId)?.genres ?? [],
        ),
        status:
          progress.pageNumber >= progress.totalPages
            ? ('completed' as const)
            : ('reading' as const),
        isFavorite:
          entries.find((entry) => entry.mediaId === progress.mangaId)?.isFavorite ?? false,
        tags: entries.find((entry) => entry.mediaId === progress.mangaId)?.tags ?? [],
        addedAt: progress.updatedAt,
        updatedAt: progress.updatedAt,
      })),
      ...Object.values(novelProgress).map((progress) => ({
        mediaId: progress.novelId,
        mediaType: 'novel' as const,
        status: progress.scrollPercentage >= 0.95 ? ('completed' as const) : ('reading' as const),
        isFavorite:
          entries.find((entry) => entry.mediaId === progress.novelId && entry.mediaType === 'novel')
            ?.isFavorite ?? false,
        tags:
          entries.find((entry) => entry.mediaId === progress.novelId && entry.mediaType === 'novel')
            ?.tags ?? [],
        addedAt: progress.updatedAt,
        updatedAt: progress.updatedAt,
      })),
    ];

    // For 'downloaded' view, build synthetic entries from download store
    const downloadedEntries: LibraryEntry[] = Array.from(downloadedMediaIds).flatMap((mediaId) => {
      const found =
        catalog.find((c) => c.id === mediaId) ??
        entries.find((e) => e.mediaId === mediaId);
      if (!found) return [];
      const mediaType = (found as { mediaType?: LibraryMediaType }).mediaType ?? 'manga';
      const now = Date.now();
      return [
        {
          mediaId,
          mediaType,
          status: (mediaType === 'anime' ? 'watching' : 'reading') as LibraryStatus,
          isFavorite: entries.find((e) => e.mediaId === mediaId)?.isFavorite ?? false,
          tags: entries.find((e) => e.mediaId === mediaId)?.tags ?? [],
          addedAt: now,
          updatedAt: now,
        },
      ];
    });

    const source =
      view === 'history'
        ? historyEntries
        : view === 'downloaded'
          ? downloadedEntries
          : entries;

    const unique = new Map(source.map((entry) => [`${entry.mediaType}:${entry.mediaId}`, entry]));

    return Array.from(unique.values())
      .filter((entry) => mediaFilter === 'all' || entry.mediaType === mediaFilter)
      .filter((entry) => view !== 'favorites' || entry.isFavorite)
      .filter((entry) => selectedTag === 'all' || entry.tags.includes(selectedTag))
      .filter(
        (entry) =>
          view === 'history' ||
          view === 'downloaded' ||
          statusFilter === 'all' ||
          entry.status === statusFilter,
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .flatMap((entry) => {
        const item = catalog.find(
          (candidate) => candidate.id === entry.mediaId && candidate.mediaType === entry.mediaType,
        );
        if (!item) return [];
        const anime = entry.mediaType === 'anime' ? animeProgress[entry.mediaId] : undefined;
        const manga =
          entry.mediaType !== 'anime' && entry.mediaType !== 'novel'
            ? mangaProgress[entry.mediaId]
            : undefined;
        const novel = entry.mediaType === 'novel' ? novelProgress[entry.mediaId] : undefined;
        const progress = anime
          ? anime.positionSeconds / anime.durationSeconds
          : manga
            ? manga.pageNumber / manga.totalPages
            : novel?.scrollPercentage;
        const subtitle = anime
          ? `Episode ${anime.episodeNumber}: ${anime.episodeTitle}`
          : manga
            ? `Chapter ${manga.chapterNumber}: page ${manga.pageNumber}`
            : novel
              ? `Chapter ${novel.chapterNumber}: ${Math.round(novel.scrollPercentage * 100)}%`
              : view === 'downloaded'
                ? `${downloadedMediaIds.has(entry.mediaId) ? 'Chapters/Episodes downloaded' : ''}`
                : entry.status;
        const route =
          item.mediaType === 'anime'
            ? animeDetailsHref(item.id)
            : item.mediaType === 'novel'
              ? novelDetailsHref(item.id)
              : mangaDetailsHref(item.id);
        return [
          {
            entry,
            item,
            progress: progress === undefined ? undefined : Math.min(Math.max(progress, 0), 1),
            subtitle,
            route,
          },
        ];
      });
  }, [
    animeProgress,
    catalog,
    downloadedMediaIds,
    entries,
    mediaFilter,
    mangaProgress,
    novelProgress,
    selectedTag,
    statusFilter,
    view,
  ]);

  const cycleStatus = (entry: LibraryEntry) => {
    const statuses: LibraryStatus[] =
      entry.mediaType === 'anime'
        ? ['watching', 'completed', 'dropped', 'plan-to-watch']
        : ['reading', 'completed', 'dropped', 'plan-to-read'];
    setStatus(
      entry.mediaId,
      entry.mediaType,
      statuses[(statuses.indexOf(entry.status) + 1) % statuses.length],
    );
  };

  const handleDismiss = (entry: LibraryEntry) => {
    if (view === 'history') {
      // Remove from progress/history
      if (entry.mediaType === 'anime') removeAnimeProgress(entry.mediaId);
      else if (entry.mediaType === 'novel') removeNovelProgress(entry.mediaId);
      else removeMangaProgress(entry.mediaId);
    } else if (view === 'library' || view === 'favorites') {
      removeFromLibrary(entry.mediaId, entry.mediaType);
    }
    // For 'downloaded' view, swipe does nothing (user should delete from Downloads tab)
  };

  const swipeEnabled = view === 'library' || view === 'favorites' || view === 'history';

  const emptyMessages: Record<ExtendedView, string> = {
    library: 'Add titles from their detail screens to build your library.',
    favorites: 'Mark titles as favorites to see them here.',
    history: 'Start reading or watching to build your history.',
    downloaded: 'Download chapters or episodes to see them here.',
  };

  const showStatusFilter = view !== 'history' && view !== 'downloaded';

  return (
    <Screen scrollable contentContainerClassName="gap-5 pb-8">
      <View className="gap-1">
        <Text variant="h1">Library</Text>
        <Text tone="muted">Your saved titles, favorites, and activity.</Text>
      </View>

      {/* View Tabs */}
      <View className="flex-row gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900">
        {viewTabs.map((tab) => {
          const isActive = view === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setView(tab.id)}
              className={`flex-1 items-center gap-0.5 rounded-lg px-2 py-2 ${
                isActive ? 'bg-white dark:bg-neutral-700' : ''
              }`}
            >
              <Ionicons
                name={tab.icon as 'library-outline'}
                size={16}
                color={isActive ? '#6366f1' : '#9ca3af'}
              />
              <Text
                className={`text-center text-[10px] font-semibold ${
                  isActive ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Media Type filter */}
      <View className="gap-2">
        <Text variant="label">Media</Text>
        <View className="flex-row flex-wrap gap-2">
          {mediaFilters.map((filter) => (
            <Pressable
              key={filter.id}
              onPress={() => setMediaFilter(filter.id)}
              className={`rounded-full border px-3 py-1.5 ${
                mediaFilter === filter.id
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-neutral-300 dark:border-neutral-700'
              }`}
            >
              <Text className="text-xs">{filter.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Tags */}
      {tags.length > 0 ? (
        <View className="gap-2">
          <Text variant="label">Tags</Text>
          <View className="flex-row flex-wrap gap-2">
            {['all', ...tags].map((tag) => (
              <Pressable
                key={tag}
                onPress={() => setSelectedTag(tag)}
                className={`rounded-full border px-3 py-1.5 ${
                  selectedTag === tag
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-neutral-300 dark:border-neutral-700'
                }`}
              >
                <Text className="text-xs">{tag === 'all' ? 'All Tags' : tag}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* Status filter (hidden for history and downloaded views) */}
      {showStatusFilter ? (
        <View className="gap-2">
          <Text variant="label">Status</Text>
          <View className="flex-row flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <Pressable
                key={filter.id}
                onPress={() => setStatusFilter(filter.id)}
                className={`rounded-full border px-3 py-1.5 ${
                  statusFilter === filter.id
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-neutral-300 dark:border-neutral-700'
                }`}
              >
                <Text className="text-xs">{filter.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* Swipe hint */}
      {swipeEnabled && rows.length > 0 ? (
        <View>
          <Text variant="caption" tone="muted" className="text-center">
            Swipe right on a title to remove it from this view
          </Text>
        </View>
      ) : null}

      {/* List */}
      {rows.length > 0 ? (
        rows.map(({ entry, item, progress, subtitle, route }) =>
          swipeEnabled ? (
            <SwipeableRow
              key={`${entry.mediaType}:${entry.mediaId}`}
              onSwipeRight={() => handleDismiss(entry)}
              actionLabel="Remove"
              actionIcon="trash-outline"
            >
              <LibraryCard
                entry={entry}
                title={item.title}
                coverUrl={item.coverUrl}
                subtitle={subtitle}
                progress={progress}
                onPress={() => router.push(route)}
                onToggleFavorite={() => toggleFavorite(entry.mediaId, entry.mediaType)}
                onChangeStatus={() => cycleStatus(entry)}
              />
            </SwipeableRow>
          ) : (
            <LibraryCard
              key={`${entry.mediaType}:${entry.mediaId}`}
              entry={entry}
              title={item.title}
              coverUrl={item.coverUrl}
              subtitle={subtitle}
              progress={progress}
              onPress={() => router.push(route)}
              onToggleFavorite={() => toggleFavorite(entry.mediaId, entry.mediaType)}
              onChangeStatus={() => cycleStatus(entry)}
            />
          ),
        )
      ) : (
        <View className="items-center gap-2 py-12">
          <Ionicons
            name={
              (viewTabs.find((t) => t.id === view)?.icon ?? 'library-outline') as 'library-outline'
            }
            size={40}
            color="#d1d5db"
          />
          <Text variant="h2">
            {view === 'downloaded' ? 'No downloads yet' : 'Nothing here yet'}
          </Text>
          <Text tone="muted" className="text-center">
            {emptyMessages[view]}
          </Text>
        </View>
      )}
    </Screen>
  );
}
