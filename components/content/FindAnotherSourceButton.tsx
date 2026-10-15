import { useRouter } from 'expo-router';
import { Button } from '@/components/ui';
import { useLibraryStore } from '@/stores/libraryStore';
/** Start a user-controlled search; never silently replace a title or chapter. */
export function FindAnotherSourceButton({ routeId, title }: { routeId: string; title?: string }) {
  const router = useRouter();
  const savedTitle = useLibraryStore((s) => s.media[routeId]?.title);
  const query = title || savedTitle;
  if (!query) return null;
  return (
    <Button
      label="Find another source"
      variant="secondary"
      onPress={() => router.push({ pathname: '/(tabs)/search', params: { q: query } })}
    />
  );
}
