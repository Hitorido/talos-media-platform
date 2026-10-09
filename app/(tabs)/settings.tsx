import { PrivacySettings } from '@/components/content/PrivacyControls';
import { PopPressable as Pressable } from '@/components/ui/PopPressable';
import { appAlert as Alert } from '@/stores/dialogStore';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { UpdateModal } from '@/components/UpdateModal';
import { Screen, Text } from '@/components/ui';
import {
  checkForUpdate,
  getInstalledVersion,
  type VersionManifest,
} from '@/services/updateService';
import {
  useRollingDownloadSettingsStore,
  type RollingDownloadWindow,
} from '@/stores/rollingDownloadSettingsStore';
import { cn } from '@/utils/cn';

export default function SettingsScreen() {
  const router = useRouter();
  const [updateManifest, setUpdateManifest] = useState<VersionManifest | null>(null);
  const [checking, setChecking] = useState(false);
  const rollingDownloadsEnabled = useRollingDownloadSettingsStore((state) => state.enabled);
  const rollingDownloadWindow = useRollingDownloadSettingsStore((state) => state.windowSize);
  const setRollingDownloadsEnabled = useRollingDownloadSettingsStore((state) => state.setEnabled);
  const setRollingDownloadWindow = useRollingDownloadSettingsStore((state) => state.setWindowSize);

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

      <PrivacySettings />
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
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1 gap-1">
            <Text variant="label">Rolling chapter downloads</Text>
            <Text variant="caption" tone="muted">
              Keep upcoming manga, manhwa, manhua, or novel chapters available offline. Read
              chapters are removed as the window advances.
            </Text>
          </View>
          <Switch value={rollingDownloadsEnabled} onValueChange={setRollingDownloadsEnabled} />
        </View>
        {rollingDownloadsEnabled ? (
          <View className="flex-row rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
            {([5, 10, 15, 20] as RollingDownloadWindow[]).map((size) => (
              <Pressable
                key={size}
                accessibilityRole="button"
                accessibilityState={{ selected: rollingDownloadWindow === size }}
                onPress={() => setRollingDownloadWindow(size)}
                className={cn(
                  'flex-1 items-center rounded-md px-2 py-2',
                  rollingDownloadWindow === size && 'bg-white dark:bg-neutral-700',
                )}
              >
                <Text
                  className={cn(
                    'text-xs font-semibold',
                    rollingDownloadWindow === size
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-neutral-500',
                  )}
                >
                  {size}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

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
