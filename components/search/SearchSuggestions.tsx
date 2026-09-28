import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui';
import { getDiscovery, type DiscoveryItem } from '@/services/discoveryService';
import { useProviderStore } from '@/stores/providerStore';
import { animeDetailsHref, mangaDetailsHref, novelDetailsHref } from '@/lib/routes';
import type { SearchFilter, SearchResult } from '@/types/search';

export function selectSearchSuggestions(items:DiscoveryItem[],results:SearchResult[],filter:SearchFilter,query:string) {
 const accepts=(item:DiscoveryItem|SearchResult)=>filter==='all'||filter==='anime'&&item.type==='anime'||filter==='novel'&&item.type==='novel'||item.type==='manga'&&(item.comicFormat??'manga')===filter;
 const pool=query.trim()&&results.length?results:items;
 return [...new Map(pool.filter(accepts).map(item=>[item.id,item])).values()].slice(0,6);
}
export function SearchSuggestions({filter,query,results}:{filter:SearchFilter;query:string;results:SearchResult[]}) {
 const enabled=useProviderStore(s=>s.enabled),router=useRouter();
 const [items,setItems]=useState<DiscoveryItem[]>([]);
 useEffect(()=>{let current=true;getDiscovery(enabled).then(sections=>{if(current)setItems(sections.filter(s=>s.id.startsWith('trending')).flatMap(s=>s.items))},()=>{if(current)setItems([])});return()=>{current=false}},[enabled]);
 const suggestions=selectSearchSuggestions(items,results,filter,query).filter(item=>enabled[item.providerId]);
 return <View className="gap-2"><Text variant="caption" tone="muted">{query.trim()&&results.length?'Suggested matches':query.trim()?'Explore while searching':'Recommended to explore'}</Text>
  {suggestions.length?<ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:8}}>{suggestions.map(item=><Pressable key={item.id} accessibilityRole="button" className="w-44 flex-row items-center gap-2 rounded-xl bg-neutral-100 p-2 dark:bg-neutral-900" onPress={()=>router.push(item.type==='anime'?animeDetailsHref(item.id):item.type==='novel'?novelDetailsHref(item.id):mangaDetailsHref(item.id))}>
   {item.coverUrl?.trim()?<Image source={{uri:item.coverUrl}} style={{width:34,height:48,borderRadius:5}}/>:null}<View className="flex-1"><Text variant="caption" numberOfLines={2}>{item.title}</Text><Text variant="caption" tone="muted">{item.type==='manga'?(item.comicFormat??'manga'):item.type}</Text></View>
  </Pressable>)}</ScrollView>:<Text variant="caption" tone="muted">Suggestions appear when an enabled source returns titles.</Text>}
 </View>;
}
