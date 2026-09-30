import { Stack } from 'expo-router';

export default function AnimeLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="[id]/index" options={{ title: '', headerShown: false }} />
      <Stack.Screen
        name="[id]/watch/[episodeId]"
        options={{ title: 'Now Playing', headerShown: false }}
      />
    </Stack>
  );
}
