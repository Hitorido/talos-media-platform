import type { Href } from 'expo-router';

export function animeDetailsHref(animeId: string): Href {
  return `/anime/${encodeURIComponent(animeId)}` as Href;
}

export function animeWatchHref(animeId: string, episodeId: string): Href {
  return `/anime/${encodeURIComponent(animeId)}/watch/${encodeURIComponent(episodeId)}` as Href;
}

export function mangaDetailsHref(mangaId: string): Href {
  return `/manga/${encodeURIComponent(mangaId)}` as Href;
}

export function mangaReadHref(mangaId: string, chapterId: string): Href {
  return `/manga/${encodeURIComponent(mangaId)}/read/${encodeURIComponent(chapterId)}` as Href;
}

export function novelDetailsHref(novelId: string): Href {
  return `/novel/${encodeURIComponent(novelId)}` as Href;
}

export function novelReadHref(novelId: string, chapterId: string): Href {
  return `/novel/${encodeURIComponent(novelId)}/read/${encodeURIComponent(chapterId)}` as Href;
}
