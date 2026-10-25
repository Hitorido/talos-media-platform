import { Text } from '@/components/ui/Text';
import { ActivityIndicator, View } from 'react-native';

export function SearchLoadingState() {
  return (
    <View className="flex-1 items-center justify-center py-12">
      <ActivityIndicator size="large" color="#8b5cf6" />
      <Text variant="caption" tone="muted" className="mt-3">
        Searching...
      </Text>
    </View>
  );
}
