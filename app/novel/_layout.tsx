import { Stack } from 'expo-router';

export default function NovelLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="[id]/index" options={{ title: 'Novel Details' }} />
      <Stack.Screen
        name="[id]/read/[chapterId]"
        options={{ title: 'Reader', headerShown: false }}
      />
    </Stack>
  );
}
