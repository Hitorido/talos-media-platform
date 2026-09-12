import { View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/ui';

type SearchEmptyStateProps = {
  query: string;
};

export function SearchEmptyState({ query }: SearchEmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <SymbolView name="doc.text.magnifyingglass" tintColor="#737373" size={40} />
      <Text variant="h3" className="mt-4 text-center">
        No results found
      </Text>
      <Text tone="muted" className="mt-2 text-center">
        Nothing matched &quot;{query}&quot;. Try another title, genre, or keyword.
      </Text>
    </View>
  );
}
