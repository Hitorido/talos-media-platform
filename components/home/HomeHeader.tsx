import { Image, View } from 'react-native';

import { Text } from '@/components/ui';

const talosLogo = require('../../assets/images/icon.png');

export function HomeHeader() {
  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2">
        <Image source={talosLogo} className="h-8 w-8 rounded-lg" resizeMode="contain" />
        <Text
          variant="caption"
          className="font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400"
        >
          Talos
        </Text>
      </View>
      <Text variant="display">Discover</Text>
      <Text tone="muted">Pick up where you left off or explore something new.</Text>
    </View>
  );
}
