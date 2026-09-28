import type { Href } from 'expo-router';

export function animeDetailsHref(animeId: string): Href {
  return `/anime/${encodeURIComponent(animeId)}` as Href;
}

export function animeWatchHref(animeId: string, episodeId: string, seconds?: number): Href {
  return `/anime/${encodeURIComponent(animeId)}/watch/${encodeURIComponent(episodeId)}${seconds === undefined ? '' : '?seconds='+Math.max(0,seconds)}` as Href;
}

export function mangaDetailsHref(mangaId: string): Href {
  return `/manga/${encodeURIComponent(mangaId)}` as Href;
}

export function mangaReadHref(mangaId: string, chapterId: string, page?: number): Href {
  return `/manga/${encodeURIComponent(mangaId)}/read/${encodeURIComponent(chapterId)}${page === undefined ? '' : '?page='+Math.max(1,Math.floor(page))}` as Href;
}

export function novelDetailsHref(novelId: string): Href {
  return `/novel/${encodeURIComponent(novelId)}` as Href;
}

export function novelReadHref(novelId: string, chapterId: string, progress?: number): Href {
  return `/novel/${encodeURIComponent(novelId)}/read/${encodeURIComponent(chapterId)}${progress === undefined ? '' : '?progress='+Math.max(0,Math.min(1,progress))}` as Href;
}
