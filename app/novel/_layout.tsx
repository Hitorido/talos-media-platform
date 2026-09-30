import { Stack } from 'expo-router';

export default function NovelLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="[id]/index" options={{ title: '', headerShown: false }} />
      <Stack.Screen
        name="[id]/read/[chapterId]"
        options={{ title: 'Read chapter', headerShown: false }}
      />
    </Stack>
  );
}
