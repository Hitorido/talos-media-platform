import { Text } from '@/components/ui';

export function HomeHeader() {
  return (
    <>
      <Text variant="display">Discover</Text>
      <Text tone="muted" className="mt-1">
        Pick up where you left off or explore something new.
      </Text>
    </>
  );
}
