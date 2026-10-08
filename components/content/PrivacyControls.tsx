import { useEffect } from 'react';
import { AppState, View, Switch } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Text } from '@/components/ui';
import { usePrivacyStore, unlockPrivate, relockPrivateOnBackground } from '@/stores/privacyStore';
import { useHiddenPrivateIds } from '@/hooks/useHiddenPrivateIds';
export function PrivacyLifecycle() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') relockPrivateOnBackground();
    });
    return () => sub.remove();
  }, []);
  return null;
}
export function PrivacySettings() {
  const incognito = usePrivacyStore((s) => s.incognito),
    configured = usePrivacyStore((s) => s.configured),
    unlocked = usePrivacyStore((s) => s.unlocked);
  return (
    <View className="gap-3 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-900">
      <Text variant="h3">Privacy</Text>
      <View className="flex-row items-center justify-between">
        <Text>Incognito session</Text>
        <Switch value={incognito} onValueChange={usePrivacyStore.getState().setIncognito} />
      </View>
      <Text variant="caption" tone="muted">
        Skips new search history, reading progress and automatic downloads. Explicit bookmarks,
        favorites and downloads are still saved. This does not hide traffic from websites.
      </Text>
      <Button
        label={configured ? 'Unlock Private' : 'Set up Private'}
        onPress={() => void unlockPrivate(true)}
      />
      {unlocked ? (
        <Button
          label="Lock Private"
          variant="secondary"
          onPress={usePrivacyStore.getState().lock}
        />
      ) : null}
      <Text variant="caption" tone="muted">
        Private uses your phone fingerprint or device passcode and locks in the background. It hides
        saved titles in the app; downloaded files and local storage are not encrypted.
      </Text>
    </View>
  );
}
export function PrivateSessionButton() {
  const active = usePrivacyStore((s) => s.incognito);
  return (
    <Button
      size="sm"
      variant="secondary"
      label={active ? 'End incognito' : 'Read / watch privately'}
      onPress={() => usePrivacyStore.getState().setIncognito(!active)}
    />
  );
}
export function PrivacyAccessGate({ children }: { children: React.ReactNode }) {
  const { id } = useLocalSearchParams<{ id: string }>(),
    hidden = useHiddenPrivateIds(),
    router = useRouter();
  if (!hidden.has(id)) return <>{children}</>;
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-neutral-950 p-6">
      <Text className="text-white" variant="h2">
        Private title
      </Text>
      <Button label="Unlock" onPress={() => void unlockPrivate()} />
      <Button
        label="Settings"
        variant="secondary"
        onPress={() => router.push('/(tabs)/settings')}
      />
      <Button label="Go back" variant="secondary" onPress={() => router.back()} />
    </View>
  );
}
