import { Pressable, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Button, Text } from '@/components/ui';
import { cn } from '@/utils/cn';

type SearchHistoryListProps = {
  history: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
  onClear: () => void;
  className?: string;
};

export function SearchHistoryList({
  history,
  onSelect,
  onRemove,
  onClear,
  className,
}: SearchHistoryListProps) {
  if (history.length === 0) {
    return (
      <View className={cn('flex-1 items-center justify-center px-6', className)}>
        <SymbolView name="magnifyingglass" tintColor="#737373" size={40} />
        <Text variant="h3" className="mt-4 text-center">
          Search the catalog
        </Text>
        <Text tone="muted" className="mt-2 text-center">
          Find anime, manga, and novels by title, genre, or keyword.
        </Text>
      </View>
    );
  }

  return (
    <View className={cn('gap-3', className)}>
      <View className="flex-row items-center justify-between">
        <Text variant="h3">Recent searches</Text>
        <Button label="Clear" variant="ghost" size="sm" onPress={onClear} />
      </View>
      <View className="gap-2">
        {history.map((term) => (
          <View
            key={term}
            className="flex-row items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-3 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => onSelect(term)}
              className="flex-1 flex-row items-center gap-3"
            >
              <SymbolView name="clock.arrow.circlepath" tintColor="#737373" size={18} />
              <Text variant="body">{term}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${term} from history`}
              onPress={() => onRemove(term)}
              className="p-1"
            >
              <SymbolView name="xmark" tintColor="#737373" size={16} />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}
