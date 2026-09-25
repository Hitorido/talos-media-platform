import { useEffect, useState } from 'react';
import { Text } from '@/components/ui';
import { getEnglishChapterCount } from '@/services/englishChapterCount';
import type { ContentType } from '@/types/content';

/** Counts load independently of the first search/discovery cards; never fetch chapter content. */
export function MediaCount({routeId,type,episodeCount,chapterCount}:{routeId:string;type:ContentType;episodeCount?:number;chapterCount?:number}) {
  const [result,setResult] = useState<{id:string;count?:number;failed?:boolean}>({id:routeId});
  useEffect(() => {
    if (type === 'anime' || (type === 'novel' && chapterCount !== undefined)) return;
    let current = true;
    const controller = new AbortController();
    // Avoid starting jobs for cards immediately discarded by typing/navigation.
    const timer = setTimeout(() => {
      getEnglishChapterCount(routeId, controller.signal).then(count => {if(current)setResult({id:routeId,count});}, () => {if(current)setResult({id:routeId,failed:true});});
    }, 250);
    return () => {current=false;controller.abort();clearTimeout(timer);};
  },[routeId,type,chapterCount]);
  if(type==='anime') return <Text variant="caption" tone="muted">{episodeCount ? episodeCount+' Episodes' : 'Episode count unavailable'}</Text>;
  const count=type==='novel'&&chapterCount!==undefined?chapterCount:result.id===routeId?result.count:undefined;
  return <Text variant="caption" tone="muted">{count!==undefined?count+' English chapters'+(type==='novel'&&chapterCount!==undefined?' in catalog':''):result.id===routeId&&result.failed?'English chapter count unavailable':'Counting English chapters...'}</Text>;
}
