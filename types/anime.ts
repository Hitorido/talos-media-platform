export type AnimeEpisode = {
  id: string;
  number: number;
  title: string;
  durationSeconds: number;
  streamUrl: string;
  thumbnailUrl: string;
};

export type AnimeDetails = {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  bannerUrl: string;
  genres: string[];
  rating: number;
  status: 'ongoing' | 'completed';
  episodes: AnimeEpisode[];
};

export type EpisodeProgress = {
  animeId: string;
  episodeId: string;
  episodeNumber: number;
  episodeTitle: string;
  positionSeconds: number;
  durationSeconds: number;
  updatedAt: number;
};

export type ContinueWatchingEntry = {
  animeId: string;
  title: string;
  coverUrl: string;
  bannerUrl: string;
  episodeId: string;
  episodeNumber: number;
  episodeTitle: string;
  totalEpisodes: number;
  progress: number;
};
