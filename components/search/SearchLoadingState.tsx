import { DuckLoader } from '@/components/ui/DuckLoader';
import { Text } from '@/components/ui/Text';
import { View } from 'react-native';

export function SearchLoadingState() {
  return (
    <View className="flex-1 items-center justify-center py-12">
      <DuckLoader />
      <Text variant="caption" tone="muted" className="mt-3">
        Searching...
      </Text>
    </View>
  );
}
