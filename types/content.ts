export type ContentType = 'anime' | 'manga' | 'novel';

/** Comic subtype used when SearchResult.type is manga (shared reader route). */
export type ComicFormat = 'manga' | 'manhwa' | 'manhua';

export type BaseContent = {
  id: string;
  title: string;
  coverUrl: string;
  type: ContentType;
};

export type ContinueWatchingItem = BaseContent & {
  type: 'anime';
  episode: number;
  totalEpisodes: number;
  progress: number;
  episodeTitle: string;
};

export type ContinueReadingItem = BaseContent & {
  type: 'manga' | 'novel';
  chapter: number;
  totalChapters: number;
  progress: number;
  chapterTitle: string;
};

export type TrendingItem = BaseContent & {
  rating: number;
  rank: number;
};

export type RecentlyUpdatedItem = BaseContent & {
  latestLabel: string;
  updatedAgo: string;
};

export type RecommendationItem = BaseContent & {
  reason: string;
  matchScore: number;
};

export type HomeFeedData = {
  continueWatching: ContinueWatchingItem[];
  continueReading: ContinueReadingItem[];
  trendingAnime: TrendingItem[];
  trendingManga: TrendingItem[];
  trendingNovels: TrendingItem[];
  recentlyUpdated: RecentlyUpdatedItem[];
  recommendations: RecommendationItem[];
};
