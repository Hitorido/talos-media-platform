import { homeFeedData } from '@/services/mock/homeData';
import type { ContentType } from '@/types/content';
import type { SearchResult } from '@/types/search';

function cover(seed: string) {
  return `https://picsum.photos/seed/${seed}/400/600`;
}

type CatalogEntry = {
  id: string;
  title: string;
  coverUrl: string;
  type: ContentType;
  subtitle: string;
  tags: string[];
};

const extraCatalog: CatalogEntry[] = [
  {
    id: 'anime-extra-1',
    type: 'anime',
    title: 'Spirit Walker',
    coverUrl: cover('spirit-walker'),
    subtitle: 'Action · Fantasy · 12 episodes',
    tags: ['action', 'fantasy', 'adventure'],
  },
  {
    id: 'manga-extra-1',
    type: 'manga',
    title: 'Ocean Ledger',
    coverUrl: cover('ocean-ledger'),
    subtitle: 'Drama · Mystery · 64 chapters',
    tags: ['drama', 'mystery', 'slice of life'],
  },
  {
    id: 'novel-extra-1',
    type: 'novel',
    title: 'The Hollow Compass',
    coverUrl: cover('hollow-compass'),
    subtitle: 'Fantasy · Adventure · 42 chapters',
    tags: ['fantasy', 'adventure', 'magic'],
  },
  {
    id: 'anime-extra-2',
    type: 'anime',
    title: 'Northern Star Academy',
    coverUrl: cover('northern-star'),
    subtitle: 'Romance · Comedy · 24 episodes',
    tags: ['romance', 'comedy', 'school'],
  },
  {
    id: 'manga-extra-2',
    type: 'manga',
    title: 'Stone Garden',
    coverUrl: cover('stone-garden'),
    subtitle: 'Horror · Supernatural · 38 chapters',
    tags: ['horror', 'supernatural', 'thriller'],
  },
  {
    id: 'novel-extra-2',
    type: 'novel',
    title: 'Beneath the Violet Sky',
    coverUrl: cover('violet-sky'),
    subtitle: 'Romance · Drama · 28 chapters',
    tags: ['romance', 'drama', 'fantasy'],
  },
];

function fromHomeFeed(): CatalogEntry[] {
  const entries: CatalogEntry[] = [];

  homeFeedData.trendingAnime.forEach((item) => {
    entries.push({
      id: item.id,
      title: item.title,
      coverUrl: item.coverUrl,
      type: item.type,
      subtitle: `Anime · ★ ${item.rating.toFixed(1)} · Rank #${item.rank}`,
      tags: ['anime', 'trending'],
    });
  });

  homeFeedData.trendingManga.forEach((item) => {
    entries.push({
      id: item.id,
      title: item.title,
      coverUrl: item.coverUrl,
      type: item.type,
      subtitle: `Manga · ★ ${item.rating.toFixed(1)} · Rank #${item.rank}`,
      tags: ['manga', 'trending'],
    });
  });

  homeFeedData.trendingNovels.forEach((item) => {
    entries.push({
      id: item.id,
      title: item.title,
      coverUrl: item.coverUrl,
      type: item.type,
      subtitle: `Novel · ★ ${item.rating.toFixed(1)} · Rank #${item.rank}`,
      tags: ['novel', 'trending'],
    });
  });

  homeFeedData.continueWatching.forEach((item) => {
    entries.push({
      id: item.id,
      title: item.title,
      coverUrl: item.coverUrl,
      type: item.type,
      subtitle: `Anime · Ep ${item.episode}/${item.totalEpisodes}`,
      tags: ['anime', 'continue watching'],
    });
  });

  homeFeedData.continueReading.forEach((item) => {
    entries.push({
      id: item.id,
      title: item.title,
      coverUrl: item.coverUrl,
      type: item.type,
      subtitle: `${item.type === 'manga' ? 'Manga' : 'Novel'} · Ch ${item.chapter}/${item.totalChapters}`,
      tags: [item.type, 'continue reading'],
    });
  });

  homeFeedData.recentlyUpdated.forEach((item) => {
    entries.push({
      id: item.id,
      title: item.title,
      coverUrl: item.coverUrl,
      type: item.type,
      subtitle: `${item.latestLabel} · ${item.updatedAgo}`,
      tags: [item.type, 'recent'],
    });
  });

  homeFeedData.recommendations.forEach((item) => {
    entries.push({
      id: item.id,
      title: item.title,
      coverUrl: item.coverUrl,
      type: item.type,
      subtitle: item.reason,
      tags: [item.type, 'recommended'],
    });
  });

  return entries;
}

const catalogMap = new Map<string, CatalogEntry>();

[...fromHomeFeed(), ...extraCatalog].forEach((entry) => {
  catalogMap.set(entry.id, entry);
});

export const searchCatalog: SearchResult[] = Array.from(catalogMap.values()).map((entry) => ({
  ...entry,
  providerId: 'builtin-mock',
  sourceId: entry.id,
}));
