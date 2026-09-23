import { SourceWebsiteButton } from '@/components/content/SourceWebsiteButton';
import { Stack } from 'expo-router';
import { View } from 'react-native';

import { SourcesContent } from '@/components/settings/SourcesContent';
import { Screen, Text } from '@/components/ui';

export default function SourcesScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Sources', headerShown: true }} />
      <Screen scrollable contentContainerClassName="gap-4 pb-8">
        <View className="gap-1">
          <Text variant="h2">Content Sources</Text>
          <Text tone="muted">
            Enable providers for search and reading. Disabled providers are skipped automatically.
            Some providers use the Talos content gateway; availability depends on the source and platform.
          </Text>
        </View>
        <SourcesContent />
        <Text variant="h3">Website reading and discovery</Text>
        <Text tone="muted">These open the source in your browser; they are not native Talos reader integrations. Site availability varies.</Text>
        {['novelarrow','freewebnovel','novelbin','novelupdates','mangagg','mangaowl'].map(id=><SourceWebsiteButton key={id} routeId={id} />)}
      </Screen>
    </>
  );
}
