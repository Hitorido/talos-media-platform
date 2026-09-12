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
            Scraper-based sources require a self-hosted backend and are shown as Requires Backend.
          </Text>
        </View>
        <SourcesContent />
      </Screen>
    </>
  );
}
