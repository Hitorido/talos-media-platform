import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
export function DetailActions({
  onPress,
  continuing,
}: {
  onPress: () => void;
  continuing: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', bottom: Math.max(16, insets.bottom), right: 16 }}
    >
      <Button label={continuing ? 'Continue' : 'Start'} onPress={onPress} />
    </View>
  );
}
