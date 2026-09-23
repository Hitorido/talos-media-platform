import { View } from 'react-native';
import { Badge, Text } from '@/components/ui';
import { SourceWebsiteButton } from './SourceWebsiteButton';
import { sourceWebsite } from '@/services/sourceWebsite';
import { languageLabel } from '@/utils/novelLanguage';
export function MediaSourceHeader({id,type,count,language}:{id:string;type:string;count:number;language?:string}) {
 const source=sourceWebsite(id);
 return <View className="gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
 <View className="flex-row flex-wrap gap-2"><Badge label={type} variant="primary" />{type==='Novel'?<Badge label={languageLabel(language)} variant="secondary" />:null}</View>
 <Text variant="label">{source?.name ?? 'Local catalog'}</Text>
 {count>0?<Text variant="h3">{count} {type==='Anime'?'Episodes':source?.providerId==='novelcodex'?'Public Chapters':'Chapters'}</Text>:<Text tone="muted">No chapter/episode list available</Text>}
 {source?<Text variant="caption" tone="muted">{source.mode}</Text>:null}
 <SourceWebsiteButton routeId={id} />
 </View>;
}
