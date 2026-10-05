import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { View } from 'react-native';
import { PopPressable as Pressable } from '@/components/ui/PopPressable';
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
      <Text variant="caption" tone="muted">
        Swipe right to delete a recent search, or tap the remove icon.
      </Text>
      <View className="gap-2">
        {history.map((term) => (
          <SwipeHistoryRow key={term} onRemove={() => onRemove(term)}>
            <View className="flex-row items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-3 dark:border-neutral-800 dark:bg-neutral-900">
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
          </SwipeHistoryRow>
        ))}
      </View>
    </View>
  );
}

function SwipeHistoryRow({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  const offset = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  const gesture = Gesture.Pan()
    .activeOffsetX(18)
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      offset.set(Math.max(0, Math.min(140, event.translationX)));
    })
    .onEnd((_event, success) => {
      if (success && offset.get() >= 90) runOnJS(onRemove)();
    })
    .onFinalize(() => {
      offset.set(withTiming(0, { duration: 150 }));
    });
  return (
    <View className="overflow-hidden rounded-xl bg-red-900">
      <View className="absolute inset-0 justify-center px-4">
        <Text className="text-white">Delete</Text>
      </View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={style}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}
