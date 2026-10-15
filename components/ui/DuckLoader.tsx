import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';
/** Original vector-like duck: no remote assets, timers or image downloads. */
export function DuckLoader() {
  const [step] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let active = true;
    const motion = Animated.loop(
      Animated.sequence([
        Animated.timing(step, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(step, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]),
    );
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (active && !reduced) motion.start();
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => {
      if (reduced) motion.stop();
      else motion.start();
    });
    return () => {
      active = false;
      motion.stop();
      subscription.remove();
    };
  }, [step]);
  return (
    <View
      accessible
      accessibilityLabel="Loading"
      style={{ width: 88, height: 72, alignSelf: 'center' }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: 15,
          top: 16,
          transform: [
            { translateY: step.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
          ],
        }}
      >
        <View style={{ width: 50, height: 34, borderRadius: 22, backgroundColor: '#facc15' }} />
        <View
          style={{
            position: 'absolute',
            left: 32,
            top: -12,
            width: 28,
            height: 28,
            borderRadius: 15,
            backgroundColor: '#fde047',
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 55,
            top: 1,
            width: 14,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#fb923c',
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 49,
            top: -3,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#18181b',
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 12,
            top: 8,
            width: 23,
            height: 16,
            borderRadius: 12,
            backgroundColor: '#eab308',
          }}
        />
      </Animated.View>
      {[0, 1].map((index) => (
        <Animated.View
          key={index}
          style={{
            position: 'absolute',
            top: 51,
            left: 30 + index * 18,
            width: 15,
            height: 5,
            borderRadius: 3,
            backgroundColor: '#fb923c',
            transform: [
              {
                translateX: step.interpolate({
                  inputRange: [0, 1],
                  outputRange: index ? [4, -4] : [-4, 4],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}
