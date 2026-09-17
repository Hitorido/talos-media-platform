import { getApiBaseUrl } from '@/lib/apiConfig';
import { apiRequest } from '@/services/api/client';
import type { MediaProvider } from '@/providers/types';
import { encodeMediaRouteId, type NormalizedMedia, type NormalizedPage, type ProviderMediaType } from '@/types/provider';

/** Bridge the existing gateway models into the existing reader; no source-specific UI. */
export function backendComicProvider(id: string, name: string): MediaProvider {
  const imageUrl = (url: string) => {
    if (id !== 'mangapill' || !url) return url;
    const parsed = new URL(url);
    if (parsed.origin !== 'https://cdn.readdetectiveconan.com') throw new Error('Unexpected MangaPill image host.');
    return getApiBaseUrl() + '/api/content/mangapill/image?path=' + encodeURIComponent(parsed.pathname + parsed.search);
  };
  const route = (sourceId: string) => `/api/content/manga/${id}/${encodeURIComponent(sourceId)}`;
  return {
    definition: { id, name, mediaTypes: ['manga','manhwa','manhua'], capabilities: ['search','details','chapters','pages'], status: 'limited', statusNote: 'Local content flow verified. Enable after the matching backend adapter is deployed.', executionMode: 'backend-api', backendRequired: true, health: {} },
    async search(query, context) {
      if (context.filter === 'anime' || context.filter === 'novel') return [];
      const type = ['manga','manhwa','manhua'].includes(context.filter) ? context.filter : 'manga';
      const data = await apiRequest<{results: {sourceId:string;title:string;coverUrl?:string;mediaType:ProviderMediaType}[]}>(`/api/content/search?providerId=${id}&mediaType=${type}&q=${encodeURIComponent(query)}`);
      return data.results.map(item=>({id:encodeMediaRouteId(id,item.sourceId),providerId:id,sourceId:item.sourceId,title:item.title,coverUrl:imageUrl(item.coverUrl??''),type:'manga' as const,comicFormat:(['manhwa','manhua'].includes(item.mediaType)?item.mediaType:'manga') as 'manga'|'manhwa'|'manhua',subtitle:name,tags:[name]}));
    },
    async getDetails(ref) {
      const data = await apiRequest<Omit<NormalizedMedia,'ref'> & {genres?:string[]}>(route(ref.sourceId));
      return {...data,ref,genres:data.genres??[],coverUrl:imageUrl(data.coverUrl??'')};
    },
    async getChapters(ref) {
      const data=await apiRequest<{chapters:{id:string;chapterNumber:number;title:string;language?:string;releaseDate?:string}[]}>(`${route(ref.sourceId)}/chapters`);
      return data.chapters.map(c=>({...c,number:c.chapterNumber}));
    },
    async getChapterPages(ref,chapterId) {
      const data=await apiRequest<{pages:NormalizedPage[]}>(`${route(ref.sourceId)}/chapters/${encodeURIComponent(chapterId)}/pages`);
      return data.pages.map(page => ({...page, imageUrl: imageUrl(page.imageUrl)}));
    },
  };
}
