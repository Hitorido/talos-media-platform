import type { MangaChapter, MangaDetails, MangaPage } from '@/types/manga';

function cover(seed: string) {
  return `https://picsum.photos/seed/${seed}/400/600`;
}

function banner(seed: string) {
  return `https://picsum.photos/seed/${seed}-banner/1200/675`;
}

function pageImage(mangaSeed: string, chapterNum: number, pageNum: number) {
  return `https://picsum.photos/seed/${mangaSeed}-c${chapterNum}-p${pageNum}/800/1200`;
}

function buildPages(mangaSeed: string, chapterNum: number, pageCount: number): MangaPage[] {
  return Array.from({ length: pageCount }, (_, index) => {
    const pageNumber = index + 1;
    return {
      pageNumber,
      imageUrl: pageImage(mangaSeed, chapterNum, pageNumber),
      aspectRatio: 0.67, // standard 2:3 manga ratio
    };
  });
}

function buildChapters(
  mangaId: string,
  mangaSeed: string,
  count: number,
  titlePrefix: string,
  pageCount: number = 8,
): MangaChapter[] {
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    return {
      id: `${mangaId}-ch-${number}`,
      number,
      title: `${titlePrefix} ${number}`,
      releaseDate: `2026-0${Math.min(number, 9)}-15`,
      pageCount,
      pages: buildPages(mangaSeed, number, pageCount),
    };
  });
}

export const mangaCatalog: MangaDetails[] = [
  {
    id: 'manga-cw-1',
    title: 'Solo Ascension',
    altTitles: ['Leveling Alone in the Abyss', 'Na Honja Seung-gwang'],
    description:
      'In a world where gates open to dungeon realms, an E-rank hunter discovers a forgotten system interface that grants him infinite progression.',
    coverUrl: cover('solo-ascension'),
    bannerUrl: banner('solo-ascension'),
    author: 'Chugong & Jang Sung-lak',
    artist: 'REDICE Studio',
    genres: ['Action', 'Fantasy', 'System', 'Manhwa'],
    rating: 9.2,
    status: 'ongoing',
    chapters: buildChapters('manga-cw-1', 'solo-ascension', 15, 'Chapter', 8),
  },
  {
    id: 'manga-cw-2',
    title: 'Celestial Martial Peak',
    altTitles: ['Wu Lian Dian Feng', 'Peak of Martial Arts'],
    description:
      'A sweeper disciple at the High Heaven Pavilion stumbles upon a black bamboo book, embarking on a journey to the apex of the martial dao.',
    coverUrl: cover('celestial-peak'),
    bannerUrl: banner('celestial-peak'),
    author: 'Momo',
    artist: 'Pikapi',
    genres: ['Action', 'Martial Arts', 'Xianxia', 'Manhua'],
    rating: 8.9,
    status: 'ongoing',
    chapters: buildChapters('manga-cw-2', 'celestial-peak', 20, 'Chapter', 10),
  },
  {
    id: 'manga-cw-3',
    title: 'Chronicles of the Wind Scholar',
    altTitles: ['Kaze no Gakushū', 'The Scholar of the Tempest'],
    description:
      'A prodigy strategist uses elemental mathematics and ancient wind scrolls to prevent war across three kingdom provinces.',
    coverUrl: cover('wind-scholar'),
    bannerUrl: banner('wind-scholar'),
    author: 'Kenji Sato',
    artist: 'Aoi Fujisawa',
    genres: ['Historical', 'Strategy', 'Adventure', 'Manga'],
    rating: 8.7,
    status: 'ongoing',
    chapters: buildChapters('manga-cw-3', 'wind-scholar', 12, 'Chapter', 6),
  },
  {
    id: 'manga-t-1',
    title: 'Iron Bloom',
    altTitles: ['Tetsu no Hana', 'Steel Lotus'],
    description:
      'BETRAYED by his guild mates, the iron knight wielder of resonance armor wakes up 300 years into the future.',
    coverUrl: cover('iron-bloom'),
    bannerUrl: banner('iron-bloom'),
    author: 'L. H. Vance',
    artist: 'Studio Moon',
    genres: ['Action', 'Fantasy', 'Mecha'],
    rating: 9.1,
    status: 'ongoing',
    chapters: buildChapters('manga-t-1', 'iron-bloom', 18, 'Chapter', 8),
  },
  {
    id: 'manga-t-2',
    title: 'Paper Dragons',
    altTitles: ['Kami no Ryū'],
    description:
      'An origami master summons mystical elemental paper dragons to defend floating islands from dark specters.',
    coverUrl: cover('paper-dragons'),
    bannerUrl: banner('paper-dragons'),
    author: 'Yuki Takahashi',
    artist: 'Yuki Takahashi',
    genres: ['Fantasy', 'Adventure', 'Supernatural'],
    rating: 8.8,
    status: 'ongoing',
    chapters: buildChapters('manga-t-2', 'paper-dragons', 14, 'Chapter', 8),
  },
  {
    id: 'manga-t-3',
    title: 'Harbor Ghost',
    altTitles: ['Minato no Yūrei'],
    description:
      'A harbor detective solves paranormal crimes along misty coastal ports using an ancient pendulum.',
    coverUrl: cover('harbor-ghost'),
    bannerUrl: banner('harbor-ghost'),
    author: 'Shinji Mikami',
    artist: 'Ken Akamatsu',
    genres: ['Mystery', 'Horror', 'Supernatural'],
    rating: 8.6,
    status: 'completed',
    chapters: buildChapters('manga-t-3', 'harbor-ghost', 10, 'Chapter', 6),
  },
  {
    id: 'manga-t-4',
    title: 'Clockwork Orchard',
    altTitles: ['Kikai no Kajuen'],
    description:
      'Two botanist engineers construct mechanical gardens capable of harvesting solar plasma.',
    coverUrl: cover('clockwork-orchard'),
    bannerUrl: banner('clockwork-orchard'),
    author: 'Kouji Seo',
    artist: 'Kouji Seo',
    genres: ['Sci-Fi', 'Steampunk'],
    rating: 8.5,
    status: 'ongoing',
    chapters: buildChapters('manga-t-4', 'clockwork-orchard', 16, 'Chapter', 8),
  },
  {
    id: 'manga-t-5',
    title: 'Silent Circuit',
    altTitles: ['Shizukana Kairo'],
    description:
      'A cybernetic rogue hacktivist infiltrates underground digital towers in Neo-Tokyo.',
    coverUrl: cover('silent-circuit'),
    bannerUrl: banner('silent-circuit'),
    author: 'Hiroshi Takagi',
    artist: 'Hiroshi Takagi',
    genres: ['Cyberpunk', 'Action', 'Sci-Fi'],
    rating: 8.3,
    status: 'completed',
    chapters: buildChapters('manga-t-5', 'silent-circuit', 12, 'Chapter', 6),
  },
];

const mangaMap = new Map(mangaCatalog.map((manga) => [manga.id, manga]));

export function getMangaById(id: string): MangaDetails | undefined {
  return mangaMap.get(id);
}

export function getMangaChapter(mangaId: string, chapterId: string): MangaChapter | undefined {
  const manga = getMangaById(mangaId);
  return manga?.chapters.find((chapter) => chapter.id === chapterId);
}

export function getNextChapter(mangaId: string, chapterId: string): MangaChapter | undefined {
  const manga = getMangaById(mangaId);
  if (!manga) return undefined;
  const index = manga.chapters.findIndex((chapter) => chapter.id === chapterId);
  if (index >= 0 && index < manga.chapters.length - 1) {
    return manga.chapters[index + 1];
  }
  return undefined;
}

export function getPreviousChapter(mangaId: string, chapterId: string): MangaChapter | undefined {
  const manga = getMangaById(mangaId);
  if (!manga) return undefined;
  const index = manga.chapters.findIndex((chapter) => chapter.id === chapterId);
  if (index > 0) {
    return manga.chapters[index - 1];
  }
  return undefined;
}
