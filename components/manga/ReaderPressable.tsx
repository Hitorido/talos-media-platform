import { Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ReaderPressableProps = PressableProps & {
  className?: string;
};

export function ReaderPressable({ onPressIn, onPressOut, ...props }: ReaderPressableProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...props}
      style={[props.style, animatedStyle]}
      onPressIn={(event) => {
        // Shared-value updates run on the UI thread in response to native press events.
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(0.94, { duration: 65 });
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
