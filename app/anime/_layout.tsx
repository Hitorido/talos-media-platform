import { Stack } from 'expo-router';

export default function AnimeLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Back',
        animation: 'none',
        // Players own their own in-screen controls; hide the header by default.
        headerShown: false,
      }}
    >
      <Stack.Screen name="[id]/index" options={{ title: '' }} />
      <Stack.Screen name="[id]/watch/[episodeId]" options={{ title: '' }} />
    </Stack>
  );
}
