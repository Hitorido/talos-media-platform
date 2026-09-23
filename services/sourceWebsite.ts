import { decodeMediaRouteId } from '@/types/provider';
const sources: Record<string,{name:string;origin:string;prefix?:string;mode:string}> = {
 mangadex:{name:'MangaDex',origin:'https://mangadex.org',prefix:'/title/',mode:'Native Reader'},
 mangapill:{name:'MangaPill',origin:'https://mangapill.com',prefix:'/manga/',mode:'Native Reader'},
 gdscans:{name:'GdScans',origin:'https://gdscans.com',prefix:'/manga/',mode:'Native Reader'},
 mangatown:{name:'MangaTown',origin:'https://www.mangatown.com',prefix:'/manga/',mode:'Native Reader'},
 kaliscan:{name:'Kaliscan',origin:'https://kaliscan.io',prefix:'/manga/',mode:'Native Reader - local backend'},
 mangajinx:{name:'MangaJinx',origin:'https://mgjinx.com',prefix:'/manga/',mode:'Native Reader - local backend'},
 weebcentral:{name:'WeebCentral',origin:'https://weebcentral.com',prefix:'/series/',mode:'Native Reader - local backend'},
 demonicscans:{name:'DemonicScans',origin:'https://demonicscans.org',prefix:'/manga/',mode:'Native Reader - local backend'},
 novelcodex:{name:'NovelCodex.org',origin:'https://www.novelcodex.org',prefix:'/novel/',mode:'Native Reader - public chapters'},
 novelarrow:{name:'NovelArrow',origin:'https://novelarrow.com',prefix:'/novel/',mode:'Native Reader - local backend'},
 narou:{name:'Narou',origin:'https://ncode.syosetu.com',prefix:'/',mode:'Native Reader - Japanese'},
 animeparadise:{name:'AnimeParadise',origin:'https://animeparadise.moe',mode:'Native Playback - phone retest needed'},
 'anilist-anime':{name:'AniList',origin:'https://anilist.co',prefix:'/anime/',mode:'Metadata / Discovery'},
 'kitsu-anime':{name:'Kitsu',origin:'https://kitsu.io',prefix:'/anime/',mode:'Metadata'},
 'jikan-anime':{name:'MyAnimeList',origin:'https://myanimelist.net',prefix:'/anime/',mode:'Metadata'},
 freewebnovel:{name:'FreeWebNovel',origin:'https://freewebnovel.com',mode:'Website only - browser access unverified'},
 novelupdates:{name:'NovelUpdates',origin:'https://www.novelupdates.com',mode:'Metadata / external links on website'},
 novelbin:{name:'NovelBin.cc (separate catalog)',origin:'https://novelbin.cc',mode:'Website only - not verified as original NovelBin'},
 mangagg:{name:'MangaGg',origin:'https://mangagg.com',mode:'Website only - browser access unverified'},
 mangaowl:{name:'MangaOwl.io',origin:'https://mangaowl.io',mode:'Website only - availability unverified'},
};
export function sourceWebsite(routeId: string | undefined, chapterId?:string) {
 if(!routeId)return undefined;
 const ref=decodeMediaRouteId(routeId) ?? {providerId:routeId,sourceId:''};
 const source=sources[ref.providerId];if(!source)return undefined;
 let url=source.origin+'/';
 if(source.prefix && /^[A-Za-z0-9][A-Za-z0-9_/-]{0,240}$/.test(ref.sourceId)) {
  url=source.origin+source.prefix+ref.sourceId.split('/').map(encodeURIComponent).join('/');
  if(ref.providerId==='novelcodex' && chapterId && /^[1-9][0-9]*$/.test(chapterId))url+='/read/'+chapterId;
 }
 return {...source,url,providerId:ref.providerId};
}
