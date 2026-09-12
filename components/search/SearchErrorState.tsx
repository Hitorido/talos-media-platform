import { View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Button, Text } from '@/components/ui';

type SearchErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export function SearchErrorState({ message, onRetry }: SearchErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <SymbolView name="exclamationmark.triangle.fill" tintColor="#ef4444" size={40} />
      <Text variant="h3" className="mt-4 text-center">
        Search failed
      </Text>
      <Text tone="muted" className="mt-2 text-center">
        {message}
      </Text>
      <Button label="Try again" onPress={onRetry} className="mt-6 w-full max-w-xs" />
    </View>
  );
}
