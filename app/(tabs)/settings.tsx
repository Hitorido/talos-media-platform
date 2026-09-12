import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Screen, Text } from '@/components/ui';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <Screen scrollable contentContainerClassName="gap-6 pb-8">
      <View className="gap-1">
        <Text variant="h1">Settings</Text>
        <Text tone="muted">Manage app preferences and content sources.</Text>
      </View>

      <Pressable
        onPress={() => router.push('/sources')}
        className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <Text variant="label">Sources</Text>
        <Text variant="caption" tone="muted" className="mt-1">
          Enable, disable, and review content providers.
        </Text>
      </Pressable>
    </Screen>
  );
}
