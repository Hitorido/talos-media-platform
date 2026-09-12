import type { ProviderMediaType } from '@/types/provider';

export type ComicFormat = 'manga' | 'manhwa' | 'manhua';

export function isComicFormat(value: string | undefined): value is ComicFormat {
  return value === 'manga' || value === 'manhwa' || value === 'manhua';
}

export function inferComicFormatFromGenres(
  genres: string[] | undefined,
  fallback: ComicFormat = 'manga',
): ComicFormat {
  const normalized = (genres ?? []).map((genre) => genre.toLowerCase());
  if (normalized.some((genre) => genre.includes('manhwa'))) return 'manhwa';
  if (normalized.some((genre) => genre.includes('manhua'))) return 'manhua';
  return fallback;
}

export function comicFormatLabel(format: ComicFormat): string {
  switch (format) {
    case 'manhwa':
      return 'Manhwa';
    case 'manhua':
      return 'Manhua';
    default:
      return 'Manga';
  }
}

export function toProviderMediaType(format: ComicFormat): ProviderMediaType {
  return format;
}
