import { useState } from 'react';
import { Linking, View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { sourceWebsite } from '@/services/sourceWebsite';
export function SourceWebsiteButton({routeId,chapterId}:{routeId?:string;chapterId?:string}) {
 const source=sourceWebsite(routeId);const target=sourceWebsite(routeId,chapterId);
 const [error,setError]=useState(false);
 if(!source||!target)return null;
 return <View className="gap-1"><Button variant="outline" label={'Open on '+source.name} onPress={() => {setError(false);void Linking.openURL(target.url).catch(()=>setError(true));}} />
 <Text variant="caption" tone="muted">Opens {new URL(target.origin).hostname} in your browser.</Text>
 {error?<Text variant="caption">Unable to open browser. Try the source website directly.</Text>:null}</View>;
}
