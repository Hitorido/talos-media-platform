export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type DownloadMediaType = 'anime' | 'manga' | 'manhwa' | 'manhua' | 'novel';

export type DownloadItem = {
  id: string; // e.g. "anime:anime-cw-1:anime-cw-1-ep-1"
  mediaId: string;
  mediaType: DownloadMediaType;
  mediaTitle: string;
  coverUrl: string;
  providerId: string;
  sourceId: string;
  unitId: string; // episodeId or chapterId
  unitNumber: number;
  unitTitle: string;
  status: DownloadStatus;
  progress: number; // 0 to 1
  bytesDownloaded: number;
  totalBytes: number;
  localPath: string | null;
  error?: string | null;
  createdAt: number;
  updatedAt: number;
  // Payload URLs needed to resume or restart download
  payload: {
    videoUrl?: string;
    pageUrls?: string[];
    paragraphs?: string[];
    wordCount?: number;
  };
};

export type DownloadSectionTab = 'all' | 'active' | 'queued' | 'completed' | 'failed';

export type DownloadProgressUpdate = {
  id: string;
  bytesDownloaded: number;
  totalBytes: number;
  progress: number;
};
