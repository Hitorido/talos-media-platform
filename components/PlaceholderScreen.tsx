import { View } from 'react-native';

import { Screen, Text } from '@/components/ui';

type PlaceholderScreenProps = {
  title: string;
  description: string;
};

export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <Screen scrollable contentContainerClassName="flex-grow justify-center gap-3">
      <View className="items-center gap-2 px-6">
        <Text variant="h1">{title}</Text>
        <Text tone="muted" className="text-center">
          {description}
        </Text>
      </View>
    </Screen>
  );
}
