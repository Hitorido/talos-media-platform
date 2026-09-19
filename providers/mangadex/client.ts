const MANGADEX_API = 'https://api.mangadex.org';

const MANGADEX_HEADERS: HeadersInit = {
  'User-Agent': 'MangaAnimeNovelReader/1.0',
  Accept: 'application/json',
};

type MangaDexResponse<T> = {
  result: string;
  data: T;
  limit?: number;
  offset?: number;
  total?: number;
};

type MangaDexLocalizedString = {
  en?: string;
  [key: string]: string | undefined;
};

type MangaDexRelationship = {
  id: string;
  type: string;
  attributes?: {
    name?: string;
    fileName?: string;
  };
};

type MangaDexMangaAttributes = {
  title: MangaDexLocalizedString;
  description: MangaDexLocalizedString;
  status: string;
  originalLanguage?: string;
  tags: { attributes: { name: MangaDexLocalizedString } }[];
};

export type MangaDexManga = {
  id: string;
  attributes: MangaDexMangaAttributes;
  relationships: MangaDexRelationship[];
};

export type MangaDexChapterAttributes = {
  title: string;
  chapter: string;
  pages: number;
  publishAt: string;
  translatedLanguage?: string;
  externalUrl?: string | null;
};

export type MangaDexChapter = {
  id: string;
  attributes: MangaDexChapterAttributes;
};

const CONTENT_RATINGS = ['safe', 'suggestive', 'erotica', 'pornographic'] as const;

function prefersSameLanguageChapter(candidate: MangaDexChapter, existing: MangaDexChapter): boolean {
  const candidateReadable = (candidate.attributes.pages ?? 0) > 0;
  const existingReadable = (existing.attributes.pages ?? 0) > 0;
  if (candidateReadable !== existingReadable) return candidateReadable;

  if ((candidate.attributes.pages ?? 0) !== (existing.attributes.pages ?? 0)) {
    return (candidate.attributes.pages ?? 0) > (existing.attributes.pages ?? 0);
  }

  return (
    new Date(candidate.attributes.publishAt).getTime() >=
    new Date(existing.attributes.publishAt).getTime()
  );
}

type MangaDexAtHomeResponse = {
  result: string;
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
    dataSaver: string[];
  };
};

async function mangadexFetch<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { headers: MANGADEX_HEADERS, signal });
  if (!response.ok) {
    throw new Error(`MangaDex request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

function pickLocalized(value?: MangaDexLocalizedString): string {
  if (!value) return '';
  return value.en ?? Object.values(value).find(Boolean) ?? '';
}

function buildCoverUrl(manga: MangaDexManga): string {
  const coverRel = manga.relationships.find((rel) => rel.type === 'cover_art');
  if (!coverRel?.attributes?.fileName) {
    return 'https://placehold.co/400x600/1f2937/9ca3af?text=MangaDex';
  }
  return `https://uploads.mangadex.org/covers/${manga.id}/${coverRel.attributes.fileName}.256.jpg`;
}

export async function searchMangaDex(query: string, limit = 12, signal?: AbortSignal): Promise<MangaDexManga[]> {
  const params = new URLSearchParams();
  params.set('title', query);
  params.set('limit', String(limit));
  params.append('includes[]', 'cover_art');
  params.set('order[relevance]', 'desc');

  const payload = await mangadexFetch<MangaDexResponse<MangaDexManga[]>>(
    `${MANGADEX_API}/manga?${params.toString()}`,
    signal,
  );
  return payload.data ?? [];
}

export async function getMangaDexManga(mangaId: string): Promise<MangaDexManga> {
  const params = new URLSearchParams();
  params.append('includes[]', 'cover_art');
  const payload = await mangadexFetch<MangaDexResponse<MangaDexManga>>(
    `${MANGADEX_API}/manga/${mangaId}?${params.toString()}`,
  );
  return payload.data;
}

export async function getMangaDexChapters(mangaId: string): Promise<MangaDexChapter[]> {
  const allChapters: MangaDexChapter[] = [];
  let offset = 0;
  // MangaDex collection endpoints typically cap limit at 100.
  const limit = 100;

  while (true) {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    params.set('order[chapter]', 'asc');
    for (const rating of CONTENT_RATINGS) {
      params.append('contentRating[]', rating);
    }
    params.set('includeEmptyPages', '0');
    params.set('includeFuturePublishAt', '0');
    params.set('includeExternalUrl', '0');

    const payload = await mangadexFetch<MangaDexResponse<MangaDexChapter[]>>(
      `${MANGADEX_API}/manga/${mangaId}/feed?${params.toString()}`,
    );

    const batch = payload.data ?? [];
    allChapters.push(...batch);

    const total = payload.total ?? batch.length;
    if (batch.length === 0 || offset + batch.length >= total) {
      break;
    }
    offset += batch.length;
  }

  // Deduplicate duplicate scanlation uploads for the same chapter number IN THE SAME LANGUAGE
  const byLanguageAndNumber = new Map<string, MangaDexChapter>();
  for (const chapter of allChapters) {
    // Skip empty/external uploads the reader cannot open.
    if ((chapter.attributes.pages ?? 0) <= 0 && chapter.attributes.externalUrl) {
      continue;
    }

    const lang = (chapter.attributes.translatedLanguage || 'en').toLowerCase();
    const chapterNum = chapter.attributes.chapter || chapter.id;
    const key = `${lang}::${chapterNum}`;

    const existing = byLanguageAndNumber.get(key);
    if (!existing || prefersSameLanguageChapter(chapter, existing)) {
      byLanguageAndNumber.set(key, chapter);
    }
  }

  return Array.from(byLanguageAndNumber.values()).sort((a, b) => {
    const numA = Number.parseFloat(a.attributes.chapter || '0');
    const numB = Number.parseFloat(b.attributes.chapter || '0');
    if (numA !== numB) {
      return numA - numB;
    }

    const langA = (a.attributes.translatedLanguage || 'en').toLowerCase();
    const langB = (b.attributes.translatedLanguage || 'en').toLowerCase();
    if (langA === 'en' && langB !== 'en') return -1;
    if (langB === 'en' && langA !== 'en') return 1;
    return langA.localeCompare(langB);
  });
}

export async function getMangaDexChapterPages(chapterId: string): Promise<string[]> {
  const payload = await mangadexFetch<MangaDexAtHomeResponse>(
    `${MANGADEX_API}/at-home/server/${chapterId}?forcePort443=true`,
  );

  if (!payload.baseUrl || !payload.chapter) {
    throw new Error('MangaDex returned an invalid at-home response');
  }

  const { baseUrl, chapter } = payload;
  const files = chapter.dataSaver.length > 0 ? chapter.dataSaver : chapter.data;
  const quality = chapter.dataSaver.length > 0 ? 'data-saver' : 'data';

  return files.map((fileName) => `${baseUrl}/${quality}/${chapter.hash}/${fileName}`);
}

export function mapMangaDexToNormalized(manga: MangaDexManga) {
  const genres = manga.attributes.tags.map((tag) => pickLocalized(tag.attributes.name)).filter(Boolean);
  const originalLanguage = (manga.attributes.originalLanguage || '').toLowerCase();
  let comicFormat: 'manga' | 'manhwa' | 'manhua' = 'manga';
  if (genres.some((genre) => genre.toLowerCase().includes('manhwa')) || originalLanguage === 'ko') {
    comicFormat = 'manhwa';
  } else if (
    genres.some((genre) => genre.toLowerCase().includes('manhua')) ||
    originalLanguage === 'zh' ||
    originalLanguage.startsWith('zh')
  ) {
    comicFormat = 'manhua';
  }

  return {
    title: pickLocalized(manga.attributes.title),
    description: pickLocalized(manga.attributes.description),
    coverUrl: buildCoverUrl(manga),
    genres,
    status: manga.attributes.status,
    comicFormat,
  };
}

export function mapMangaDexChapter(chapter: MangaDexChapter) {
  const number = Number.parseFloat(chapter.attributes.chapter || '0');
  const chapterLabel = chapter.attributes.chapter || String(number);
  const language = chapter.attributes.translatedLanguage || 'en';
  const title = chapter.attributes.title?.trim() || `Chapter ${chapterLabel}`;

  return {
    id: chapter.id,
    number: Number.isFinite(number) ? number : 0,
    title,
    releaseDate: chapter.attributes.publishAt,
    pageCount: chapter.attributes.pages ?? 0,
    language,
  };
}
