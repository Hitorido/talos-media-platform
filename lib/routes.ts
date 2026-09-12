import type { Href } from 'expo-router';

export function animeDetailsHref(animeId: string): Href {
  return `/anime/${animeId}` as Href;
}

export function animeWatchHref(animeId: string, episodeId: string): Href {
  return `/anime/${animeId}/watch/${episodeId}` as Href;
}

export function mangaDetailsHref(mangaId: string): Href {
  return `/manga/${mangaId}` as Href;
}

export function mangaReadHref(mangaId: string, chapterId: string): Href {
  return `/manga/${mangaId}/read/${chapterId}` as Href;
}

export function novelDetailsHref(novelId: string): Href {
  return `/novel/${novelId}` as Href;
}

export function novelReadHref(novelId: string, chapterId: string): Href {
  return `/novel/${novelId}/read/${chapterId}` as Href;
}
