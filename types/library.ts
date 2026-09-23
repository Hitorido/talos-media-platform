export type LibraryMediaType = 'anime' | 'manga' | 'manhwa' | 'manhua' | 'novel';

export type LibraryStatus =
  'watching' | 'reading' | 'completed' | 'dropped' | 'plan-to-watch' | 'plan-to-read';

export type LibraryEntry = {
  mediaId: string;
  mediaType: LibraryMediaType;
  status: LibraryStatus;
  isFavorite: boolean;
  tags: string[];
  addedAt: number;
  updatedAt: number;
};

export type LibraryView = 'library' | 'favorites' | 'history';

/** Local display metadata; never chapter bodies or playback URLs. */
export type LibraryMedia = {
  id: string; title: string; coverUrl: string; bannerUrl?: string;
  mediaType: LibraryMediaType; genres: string[];
  chapterCount?: number; episodeCount?: number;
};
