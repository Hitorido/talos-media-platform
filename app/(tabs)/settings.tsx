import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { UpdateModal } from '@/components/UpdateModal';
import { Screen, Text } from '@/components/ui';
import {
    checkForUpdate,
    getInstalledVersion,
    type VersionManifest,
} from '@/services/updateService';

export default function SettingsScreen() {
  const router = useRouter();
  const [updateManifest, setUpdateManifest] = useState<VersionManifest | null>(null);
  const [checking, setChecking] = useState(false);

  const handleCheckForUpdates = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const manifest = await checkForUpdate(true);
      if (manifest) {
        setUpdateManifest(manifest);
      } else {
        Alert.alert('Up to date', `You have the latest version (${getInstalledVersion()}).`);
      }
    } catch {
      Alert.alert('Check failed', 'Could not reach the update server. Try again later.');
    } finally {
      setChecking(false);
    }
  };

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

      <View className="gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Text variant="label">Display</Text>
        <Text variant="caption" tone="muted">
          Refresh rate: System / Auto
        </Text>
        <Text variant="caption" tone="muted">
          The display refresh rate is managed by the operating system. On supported Android
          hardware, the system selects the highest available rate (60, 90, or 120 Hz) automatically.
          Reanimated-powered animations in this app are frame-rate-aware and benefit from
          high-refresh displays without any manual configuration. No per-app override is available
          through Expo SDK 57.
        </Text>
      </View>

      <View className="gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Text variant="label">About</Text>
        <View className="flex-row items-center justify-between">
          <Text variant="caption" tone="muted">
            Version
          </Text>
          <Text variant="caption">{getInstalledVersion()}</Text>
        </View>
        <Pressable
          onPress={handleCheckForUpdates}
          disabled={checking}
          className="rounded-xl border border-neutral-200 px-4 py-2 dark:border-neutral-700"
          accessibilityRole="button"
          accessibilityLabel="Check for updates"
        >
          <Text variant="caption">{checking ? 'Checking…' : 'Check for updates'}</Text>
        </Pressable>
      </View>

      {updateManifest ? (
        <UpdateModal manifest={updateManifest} onDismiss={() => setUpdateManifest(null)} />
      ) : null}
    </Screen>
  );
}
