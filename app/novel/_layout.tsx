import { Stack } from 'expo-router';

export default function NovelLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Back',
        // Readers own their own in-screen controls; hide the header by default.
        headerShown: false,
      }}
    >
      <Stack.Screen name="[id]/index" options={{ title: '' }} />
      <Stack.Screen name="[id]/read/[chapterId]" options={{ title: '' }} />
    </Stack>
  );
}
