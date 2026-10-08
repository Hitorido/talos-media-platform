import { Platform, Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PopPressableProps = PressableProps & {
  className?: string;
};

export function PopPressable({ onPressIn, onPressOut, ...props }: PopPressableProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // On web, preserve className on the DOM-backed Pressable. Reanimated's wrapper
  // drops these utility styles, leaving buttons without padding or backgrounds.
  if (Platform.OS === 'web') {
    return (
      <Pressable
        accessibilityRole="button"
        {...props}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      />
    );
  }
  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...props}
      style={[props.style, animatedStyle]}
      onPressIn={(event) => {
        // Shared-value updates run on the UI thread in response to native press events.
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(0.96, { duration: 70 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(1, { duration: 85 });
        onPressOut?.(event);
      }}
    />
  );
}
