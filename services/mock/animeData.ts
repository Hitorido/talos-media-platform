import type { AnimeDetails } from '@/types/anime';

// Legal test streams for development (public sample videos / HLS fixtures).
// Note: Google gtv-videos-bucket samples currently return HTTP 403 from many networks.
export const TEST_STREAMS = {
  muxBigBuckBunny: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  muxTest: 'https://test-streams.mux.dev/test_001/stream.m3u8',
  appleBipBop:
    'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8',
  sintelTrailer: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
} as const;

function cover(seed: string) {
  return `https://picsum.photos/seed/${seed}/400/600`;
}

function banner(seed: string) {
  return `https://picsum.photos/seed/${seed}-banner/1200/675`;
}

function episodeThumb(seed: string) {
  return `https://picsum.photos/seed/${seed}-ep/640/360`;
}

function buildEpisodes(
  animeId: string,
  count: number,
  prefix: string,
  streamKeys: (keyof typeof TEST_STREAMS)[],
): AnimeDetails['episodes'] {
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    const streamKey = streamKeys[index % streamKeys.length];

    return {
      id: `${animeId}-ep-${number}`,
      number,
      title: `${prefix} Episode ${number}`,
      durationSeconds: 596,
      streamUrl: TEST_STREAMS[streamKey],
      thumbnailUrl: episodeThumb(`${animeId}-${number}`),
    };
  });
}

export const animeCatalog: AnimeDetails[] = [
  {
    id: 'anime-cw-1',
    title: 'Stellar Horizon',
    description:
      'A crew of explorers charts unknown regions beyond the aurora belt while uncovering ancient signals buried in the stars.',
    coverUrl: cover('stellar-horizon'),
    bannerUrl: banner('stellar-horizon'),
    genres: ['Sci-Fi', 'Adventure', 'Drama'],
    rating: 8.8,
    status: 'ongoing',
    episodes: buildEpisodes('anime-cw-1', 24, 'Stellar Horizon', [
      'muxBigBuckBunny',
      'sintelTrailer',
      'muxTest',
    ]),
  },
  {
    id: 'anime-cw-2',
    title: 'Blade of the Northern Wind',
    description:
      'A young swordsman enters a legendary tournament to prove his style and protect his mountain village.',
    coverUrl: cover('blade-north'),
    bannerUrl: banner('blade-north'),
    genres: ['Action', 'Fantasy'],
    rating: 8.4,
    status: 'ongoing',
    episodes: buildEpisodes('anime-cw-2', 12, 'Northern Wind', ['sintelTrailer', 'appleBipBop']),
  },
  {
    id: 'anime-cw-3',
    title: 'Echoes in the Classroom',
    description:
      'Students at a seaside academy discover memories shared through music that may rewrite their futures.',
    coverUrl: cover('echoes-class'),
    bannerUrl: banner('echoes-class'),
    genres: ['Romance', 'Slice of Life', 'Mystery'],
    rating: 8.6,
    status: 'ongoing',
    episodes: buildEpisodes('anime-cw-3', 22, 'Echoes', ['muxTest', 'muxBigBuckBunny']),
  },
  {
    id: 'anime-t-1',
    title: 'Aether Knights',
    description:
      'Knights wielding resonance armor defend floating citadels from invaders drawn to a dying sun.',
    coverUrl: cover('aether-knights'),
    bannerUrl: banner('aether-knights'),
    genres: ['Action', 'Fantasy', 'Mecha'],
    rating: 8.9,
    status: 'ongoing',
    episodes: buildEpisodes('anime-t-1', 24, 'Aether Knights', [
      'appleBipBop',
      'muxBigBuckBunny',
      'sintelTrailer',
    ]),
  },
  {
    id: 'anime-t-2',
    title: 'Quantum Petals',
    description:
      'A botanist and a physicist unravel how quantum blooms rewrite memories across parallel gardens.',
    coverUrl: cover('quantum-petals'),
    bannerUrl: banner('quantum-petals'),
    genres: ['Sci-Fi', 'Romance'],
    rating: 8.7,
    status: 'completed',
    episodes: buildEpisodes('anime-t-2', 12, 'Quantum Petals', ['sintelTrailer', 'muxTest']),
  },
];

const animeMap = new Map(animeCatalog.map((anime) => [anime.id, anime]));

export function getAnimeById(id: string): AnimeDetails | undefined {
  const direct = animeMap.get(id);
  if (direct) return direct;

  // Support provider route ids like builtin-mock__anime-cw-1
  const separator = '__';
  const index = id.indexOf(separator);
  if (index > 0) {
    const providerId = id.slice(0, index);
    const sourceId = id.slice(index + separator.length);
    if (providerId === 'builtin-mock') {
      return animeMap.get(sourceId);
    }
  }

  return undefined;
}

export function getAnimeEpisode(animeId: string, episodeId: string) {
  const anime = getAnimeById(animeId);
  return anime?.episodes.find((episode) => episode.id === episodeId);
}

export function listAnimeIds(): string[] {
  return animeCatalog.map((anime) => anime.id);
}
